import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { openai } from '@ai-sdk/openai'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase
} from '@/components/stocks'

import { z } from 'zod'
import { EventsSkeleton } from '@/components/stocks/events-skeleton'
import { Events } from '@/components/stocks/events'
import { StocksSkeleton } from '@/components/stocks/stocks-skeleton'
import { Stocks } from '@/components/stocks/stocks'
import { StockSkeleton } from '@/components/stocks/stock-skeleton'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'

import systemPrompt from '@/lib/chat/systemPrompt'
import { RecommendationItemSchema, RecommendationOptionSchema, requestELISchema } from '@/lib/chat/schema'
import fetchPrograms from '@/lib/chat/tools/fetchPrograms'
import fetchIncentives from '@/lib/chat/tools/fetchIncentives'
import { fetchDSIRE } from '@/lib/chat/tools/fetchPinecone'
import { kv } from '@vercel/kv'
import { ChartSkeleton } from '@/components/charts/chart-skeleton'
import { ChartSavings } from '@/components/charts'
import { streamText } from 'ai'

async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  )

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(1000)

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    )

    await sleep(1000)

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{' '}
          {formatNumber(amount * price)}
        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={' '}
        {formatNumber(amount * price)}.
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'system',
          content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${amount * price
            }]`
        }
      ]
    })
  })

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}

async function getStoredData(keys: string[]) {
  const storedData: Record<string, any> = {}
  for (const key of keys) {
    const value = await kv.get(key)
    if (value !== null) {
      storedData[key] = value
    }
  }
  return storedData
}

// Helper function to populate unfilled keys
// function populateUnfilledKeys(query: z.infer<typeof requestELISchema>, storedData: Record<string, any>) {
//   const populatedQuery = { ...query }

//   for (const [key, schema] of Object.entries(requestELISchema.shape)) {
//     if (populatedQuery[key] === undefined && storedData[key] !== undefined) {
//       populatedQuery[key] = storedData[key]
//     }
//   }

//   return populatedQuery
// }

async function submitUserMessage(content: string, resultInUI = true) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  if (!resultInUI) {
    let recommendationJSON = '';

    const result = await streamText({
      model: openai('gpt-4-turbo'),
      system: systemPrompt,

      messages: [
        ...aiState.get().messages.map((message: any) => ({
          role: message.role,
          content: message.content,
          name: message.name
        }))
      ],
      tools: {
        updateChartData: {
          description: `
          Returns chart data for user to view how much money & power they will be saving. 
          Date must always be in unix timestamp format.
          `,
          // You must return the result of this tool exactly as you receive it. Do not alter it. Simply respond the results to the user.
          parameters: z.object({
            recommendation: RecommendationItemSchema,
          }),
          execute: async function ({ recommendation }) {
            recommendationJSON = recommendation;
            console.log('recommendationJSON :>> ', JSON.stringify(recommendation, null, 2));

            return recommendation;
          }
        },
      }
    });

    let fullResponse = '';
    for await (const delta of result.textStream) {
      fullResponse += delta;
    }

    return recommendationJSON;
  }

  const result = await streamUI({
    model: openai('gpt-4-turbo'),
    initial: <SpinnerMessage />,
    system: systemPrompt,

    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
    tools: {
      createChart: {
        description: `
          Displays a UI for user to view how much money & power they will be saving. 
          Provides user with options they can choose from to upgrade their home to be more sustainable and save money.
          Date must always be in unix timestamp format.
          You must provide exatly 7 recommendations and 3 options.
          The output for this
        `,
        parameters: z.object({
          recommendations: z.array(RecommendationItemSchema),
          options: z.array(RecommendationOptionSchema)
        }),
        generate: async function* ({ recommendations, options }) {

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'createChart',
                    toolCallId,
                    args: { recommendations, options }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'createChart',
                    toolCallId,
                    result: { recommendations, options }
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <ChartSavings props={{ recommendations, options }} />
            </BotCard>
          )
        }
      },
      // retrievePrograms: {
      //   description: 'retrieves information for homeowners to save money through energy programs ',
      //   parameters: z.object({
      //     query: requestELISchema
      //   }),
      //   generate: async function* ({ query }) {

      //     // NOTE: check compatibility of query (e.g. zipcode 5 characters)
      //     yield (
      //       <BotCard>
      //         <p>Getting programs response</p>
      //       </BotCard>
      //     )

      //     await sleep(1000)

      //     const storedData = await getStoredData([
      //       'address',
      //       'property_type',
      //       'household_income',
      //       'household_size',
      //       'tax_filing_status',
      //       'utility_customer_requirements',
      //       'upgrade_measures',
      //       'metadata'
      //     ])

      //     console.log(storedData)
      //     const populatedQuery = populateUnfilledKeys(query, storedData)

      //     console.log(populatedQuery)


      //     let programsData: any = null;
      //     try {
      //       programsData = await fetchPrograms(populatedQuery);
      //       // Use programsData here
      //     } catch (error) {
      //       // Handle any errors here
      //       console.error('Failed to fetch programs:', error);
      //     }

      //     const toolCallId = nanoid()

      //     aiState.done({
      //       ...aiState.get(),
      //       messages: [
      //         ...aiState.get().messages,
      //         {
      //           id: nanoid(),
      //           role: 'assistant',
      //           content: [
      //             {
      //               type: 'tool-call',
      //               toolName: 'retrievePrograms',
      //               toolCallId,
      //               args: { query }
      //             }
      //           ]
      //         },
      //         {
      //           id: nanoid(),
      //           role: 'tool',
      //           content: [
      //             {
      //               type: 'tool-result',
      //               toolName: 'retrievePrograms',
      //               toolCallId,
      //               result: programsData
      //             }
      //           ]
      //         }
      //       ]
      //     })

      //     return (
      //       <BotCard>
      //         {/* pass in programsData into UI element */}
      //         <p>programs Data</p>
      //       </BotCard>
      //     )
      //   }
      // },
      // retrieveIncentives: {
      //   description: 'retrieves information for homeowners to make money through energy incentives ',
      //   parameters: z.object({
      //     query: requestELISchema
      //   }),
      //   generate: async function* ({ query }) {
      //     yield (
      //       <BotCard>
      //         <p>Getting incentive response</p>
      //       </BotCard>
      //     )

      //     await sleep(1000)

      //     let incentivesData: any = null;
      //     try {
      //       incentivesData = await fetchIncentives(query);
      //       // Use programsData here
      //     } catch (error) {
      //       // Handle any errors here
      //       console.error('Failed to fetch incentives:', error);
      //     }

      //     const toolCallId = nanoid()

      //     aiState.done({
      //       ...aiState.get(),
      //       messages: [
      //         ...aiState.get().messages,
      //         {
      //           id: nanoid(),
      //           role: 'assistant',
      //           content: [
      //             {
      //               type: 'tool-call',
      //               toolName: 'retrieveIncentives',
      //               toolCallId,
      //               args: { query }
      //             }
      //           ]
      //         },
      //         {
      //           id: nanoid(),
      //           role: 'tool',
      //           content: [
      //             {
      //               type: 'tool-result',
      //               toolName: 'retrieveIncentives',
      //               toolCallId,
      //               result: incentivesData
      //             }
      //           ]
      //         }
      //       ]
      //     })

      //     return (
      //       <BotCard>
      //         {/* pass in incentives into UI element */}
      //         <h4>Incentives</h4>
      //         <p>{JSON.stringify(incentivesData, null, 4)}</p>
      //       </BotCard>
      //     )
      //   }
      // },
      // queryDSIRE: {
      //   description: 'query to a vector database of legislation regarding state, federal, and municipal laws from DSIRE',
      //   parameters: z.object({
      //     query: z.string().describe('The query text provided to Pinecone to search for various laws')
      //   }),
      //   generate: async function* ({ query }) {
      //     yield (
      //       <BotCard>
      //         <p>Getting DSIRE response</p>
      //       </BotCard>
      //     )

      //     await sleep(1000)

      //     let matches: any = null;
      //     try {
      //       matches = await fetchDSIRE(query);
      //       console.log('matches:', typeof matches, matches)
      //     } catch (error) {
      //       // Handle any errors here
      //       console.error('Failed to fetch DSIRE data:', error);
      //     }

      //     const toolCallId = nanoid()
      //     const DSIREData = matches['matches'].map(match => match.metadata);
      //     // console.log('DSIREData:', DSIREData)
      //     // source .env.local

      //     aiState.done({
      //       ...aiState.get(),
      //       messages: [
      //         ...aiState.get().messages,
      //         {
      //           id: nanoid(),
      //           role: 'assistant',
      //           content: [
      //             {
      //               type: 'tool-call',
      //               toolName: 'queryDSIRE',
      //               toolCallId,
      //               args: { query }
      //             }
      //           ]
      //         },
      //         {
      //           id: nanoid(),
      //           role: 'tool',
      //           content: [
      //             {
      //               type: 'tool-result',
      //               toolName: 'queryDSIRE',
      //               toolCallId,
      //               result: DSIREData
      //             }
      //           ]
      //         }
      //       ]
      //     })

      //     return (
      //       <BotCard>
      //         {/* pass in DSIRE data into UI element */}
      //         <p>DSIRE data retrieved and analyzed</p>
      //       </BotCard>
      //     )
      //   }
      // },
      // storeData: {
      //   description: 'stores key value pair for longterm memory',
      //   parameters: z.object({
      //     key: z.enum([
      //       'address',
      //       'household_income',
      //       'household_size',
      //       'tax_filing_status',
      //       'property_type',
      //       'upgrade_measures',
      //       'metadata'
      //     ]).describe('The key to store the data'),
      //     value: z.union([
      //       z.object({
      //         line1: z.string().optional(),
      //         line2: z.string().optional(),
      //         city: z.string().optional(),
      //         state: z.string().optional(),
      //         zipcode: z.string() // Kept zipcode as required
      //       }),
      //       z.number(),
      //       z.string(),
      //       z.array(z.object({
      //         measure: z.string(),
      //         estimated_min_cost: z.number()
      //       })),
      //       z.object({
      //         external_id: z.string().optional() // Assuming you want this optional as well
      //       })
      //     ]).describe('The value to store')
      //   }),
      //   generate: async function* ({ key, value }) {
      //     yield `Storing ${key} as ${value}...`;

      //     await sleep(1000)

      //     try {
      //       await kv.set(key, value, { ex: 100, nx: true });
      //     } catch (error) {
      //       console.error('Failed to set value:', error);
      //     }

      //     try {
      //       const storedValue = await kv.get(key);
      //       console.log('Successfully stored value:', storedValue);
      //     } catch (error) {
      //       // Handle errors
      //     }

      //     return (
      //       <BotCard>
      //         {/* pass in DSIRE data into UI element */}
      //         <p>Stored {key} according to input</p>
      //       </BotCard>
      //     )
      //   }
      // }
      // listStocks: {
      //   description: 'List three imaginary stocks that are trending.',
      //   parameters: z.object({
      //     stocks: z.array(
      //       z.object({
      //         symbol: z.string().describe('The symbol of the stock'),
      //         price: z.number().describe('The price of the stock'),
      //         delta: z.number().describe('The change in price of the stock')
      //       })
      //     )
      //   }),
      //   generate: async function* ({ stocks }) {
      //     yield (
      //       <BotCard>
      //         <StocksSkeleton />
      //       </BotCard>
      //     )

      //     await sleep(1000)

      //     const toolCallId = nanoid()

      //     aiState.done({
      //       ...aiState.get(),
      //       messages: [
      //         ...aiState.get().messages,
      //         {
      //           id: nanoid(),
      //           role: 'assistant',
      //           content: [
      //             {
      //               type: 'tool-call',
      //               toolName: 'listStocks',
      //               toolCallId,
      //               args: { stocks }
      //             }
      //           ]
      //         },
      //         {
      //           id: nanoid(),
      //           role: 'tool',
      //           content: [
      //             {
      //               type: 'tool-result',
      //               toolName: 'listStocks',
      //               toolCallId,
      //               result: stocks
      //             }
      //           ]
      //         }
      //       ]
      //     })

      //     return (
      //       <BotCard>
      //         <Stocks props={stocks} />
      //       </BotCard>
      //     )
      //   }
      // },
      // showStockPrice: {
      //   description:
      //     'Get the current stock price of a given stock or currency. Use this to show the price to the user.',
      //   parameters: z.object({
      //     symbol: z
      //       .string()
      //       .describe(
      //         'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
      //       ),
      //     price: z.number().describe('The price of the stock.'),
      //     delta: z.number().describe('The change in price of the stock')
      //   }),
      //   generate: async function* ({ symbol, price, delta }) {
      //     yield (
      //       <BotCard>
      //         <StockSkeleton />
      //       </BotCard>
      //     )

      //     await sleep(1000)

      //     const toolCallId = nanoid()

      //     aiState.done({
      //       ...aiState.get(),
      //       messages: [
      //         ...aiState.get().messages,
      //         {
      //           id: nanoid(),
      //           role: 'assistant',
      //           content: [
      //             {
      //               type: 'tool-call',
      //               toolName: 'showStockPrice',
      //               toolCallId,
      //               args: { symbol, price, delta }
      //             }
      //           ]
      //         },
      //         {
      //           id: nanoid(),
      //           role: 'tool',
      //           content: [
      //             {
      //               type: 'tool-result',
      //               toolName: 'showStockPrice',
      //               toolCallId,
      //               result: { symbol, price, delta }
      //             }
      //           ]
      //         }
      //       ]
      //     })

      //     return (
      //       <BotCard>
      //         <Stock props={{ symbol, price, delta }} />
      //       </BotCard>
      //     )
      //   }
      // },
      // showStockPurchase: {
      //   description:
      //     'Show price and the UI to purchase a stock or currency. Use this if the user wants to purchase a stock or currency.',
      //   parameters: z.object({
      //     symbol: z
      //       .string()
      //       .describe(
      //         'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
      //       ),
      //     price: z.number().describe('The price of the stock.'),
      //     numberOfShares: z
      //       .number()
      //       .describe(
      //         'The **number of shares** for a stock or currency to purchase. Can be optional if the user did not specify it.'
      //       )
      //   }),
      //   generate: async function* ({ symbol, price, numberOfShares = 100 }) {
      //     const toolCallId = nanoid()

      //     if (numberOfShares <= 0 || numberOfShares > 1000) {
      //       aiState.done({
      //         ...aiState.get(),
      //         messages: [
      //           ...aiState.get().messages,
      //           {
      //             id: nanoid(),
      //             role: 'assistant',
      //             content: [
      //               {
      //                 type: 'tool-call',
      //                 toolName: 'showStockPurchase',
      //                 toolCallId,
      //                 args: { symbol, price, numberOfShares }
      //               }
      //             ]
      //           },
      //           {
      //             id: nanoid(),
      //             role: 'tool',
      //             content: [
      //               {
      //                 type: 'tool-result',
      //                 toolName: 'showStockPurchase',
      //                 toolCallId,
      //                 result: {
      //                   symbol,
      //                   price,
      //                   numberOfShares,
      //                   status: 'expired'
      //                 }
      //               }
      //             ]
      //           },
      //           {
      //             id: nanoid(),
      //             role: 'system',
      //             content: `[User has selected an invalid amount]`
      //           }
      //         ]
      //       })

      //       return <BotMessage content={'Invalid amount'} />
      //     } else {
      //       aiState.done({
      //         ...aiState.get(),
      //         messages: [
      //           ...aiState.get().messages,
      //           {
      //             id: nanoid(),
      //             role: 'assistant',
      //             content: [
      //               {
      //                 type: 'tool-call',
      //                 toolName: 'showStockPurchase',
      //                 toolCallId,
      //                 args: { symbol, price, numberOfShares }
      //               }
      //             ]
      //           },
      //           {
      //             id: nanoid(),
      //             role: 'tool',
      //             content: [
      //               {
      //                 type: 'tool-result',
      //                 toolName: 'showStockPurchase',
      //                 toolCallId,
      //                 result: {
      //                   symbol,
      //                   price,
      //                   numberOfShares
      //                 }
      //               }
      //             ]
      //           }
      //         ]
      //       })

      //       return (
      //         <BotCard>
      //           <Purchase
      //             props={{
      //               numberOfShares,
      //               symbol,
      //               price: +price,
      //               status: 'requires_action'
      //             }}
      //           />
      //         </BotCard>
      //       )
      //     }
      //   }
      // },
      // getEvents: {
      //   description:
      //     'List funny imaginary events between user highlighted dates that describe stock activity.',
      //   parameters: z.object({
      //     events: z.array(
      //       z.object({
      //         date: z
      //           .string()
      //           .describe('The date of the event, in ISO-8601 format'),
      //         headline: z.string().describe('The headline of the event'),
      //         description: z.string().describe('The description of the event')
      //       })
      //     )
      //   }),
      //   generate: async function* ({ events }) {
      //     yield (
      //       <BotCard>
      //         <EventsSkeleton />
      //       </BotCard>
      //     )

      //     await sleep(1000)

      //     const toolCallId = nanoid()

      //     aiState.done({
      //       ...aiState.get(),
      //       messages: [
      //         ...aiState.get().messages,
      //         {
      //           id: nanoid(),
      //           role: 'assistant',
      //           content: [
      //             {
      //               type: 'tool-call',
      //               toolName: 'getEvents',
      //               toolCallId,
      //               args: { events }
      //             }
      //           ]
      //         },
      //         {
      //           id: nanoid(),
      //           role: 'tool',
      //           content: [
      //             {
      //               type: 'tool-result',
      //               toolName: 'getEvents',
      //               toolCallId,
      //               result: events
      //             }
      //           ]
      //         }
      //       ]
      //     })

      //     return (
      //       <BotCard>
      //         <Events props={events} />
      //       </BotCard>
      //     )
      //   }
      // }
    }
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmPurchase
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState()

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'tool' ? (
          message.content.map(tool => {
            return tool.toolName === 'listStocks' ? (
              <BotCard>
                {/* TODO: Infer types based on the tool result*/}
                {/* @ts-expect-error */}
                <Stocks props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPrice' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Stock props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPurchase' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Purchase props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'getEvents' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Events props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'createChart' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <ChartSavings props={tool.result} />
              </BotCard>
            ) : null
          })
        ) : message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}

