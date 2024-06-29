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
import { Events } from '@/components/stocks/events'
import { Stocks } from '@/components/stocks/stocks'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid,
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'

import systemPrompt from '@/lib/chat/systemPrompt'
import { RecommendationItemSchema, RecommendationOptionSchema } from '@/lib/chat/schema'

import { kv } from '@vercel/kv'
import { ChartSavings } from '@/components/charts'
import { streamText } from 'ai'
import { downloadGeoTIFF, fetchCoordinates } from './tools/fetchGeoData'
import { SolarStats } from '@/components/solar-stats'
import { MapDataCanvas } from '@/components/data-layer'
import { LayerId, LayerIdOption } from './tools/fetchGeoData/solar'

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
          IT IS VERY IMPORTANT THAT THE consumptionData date range is based on a 24 hour period. Provider 24 data points.
          IT IS VERY IMPORTANT THAT THE savingsData date range is based on a 12 month period. Provide 12 data points.
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
          IT IS VERY IMPORTANT THAT THE consumptionData date range is based on a 24 hour period. Provider 24 data points.
          IT IS VERY IMPORTANT THAT THE savingsData date range is based on a 12 month period. Provide 12 data points.
          Date must always be in unix timestamp format.
          You must provide exatly 7 recommendations and 3 options.
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
      calculateSolar: {
        description: 'calculates the amount of solar power a user can generate based on their location',
        parameters: z.object({
          address: z.string().optional().describe('The address to calculate solar power for'),
          mapType: z.nativeEnum(LayerIdOption).default(LayerIdOption.MONTHLY_FLUX).describe('The type of map to display')
        }),
        generate: async function* ({ address, mapType }) {
          yield (
            <BotCard>
              <p>Generating {mapType} map for {address}</p>
            </BotCard>
          )

          const layerIds: LayerId[] = ['rgb', 'annualFlux']; // 'hourlyShade'
          // @ts-ignore
          let inputTiffs: Record<LayerId, any> = {};
          let stats;

          try {
            const storedData = await getStoredData(['address']);
            const { dataLayers, geoData } = await fetchCoordinates(address ?? storedData['address']);
            stats = geoData;

            const getLayers: Record<LayerId, () => any> = {
              mask: async () => {
                return await downloadGeoTIFF(dataLayers.maskUrl);
              },
              dsm: async () => {
                return await Promise.all([
                  downloadGeoTIFF(dataLayers.maskUrl),
                  downloadGeoTIFF(dataLayers.dsmUrl)
                ]);
              },
              rgb: async () => {
                return await Promise.all([
                  downloadGeoTIFF(dataLayers.maskUrl),
                  downloadGeoTIFF(dataLayers.rgbUrl)
                ]);
              },
              annualFlux: async () => {
                return await Promise.all([
                  downloadGeoTIFF(dataLayers.maskUrl),
                  downloadGeoTIFF(dataLayers.annualFluxUrl)
                ]);
              },
              monthlyFlux: async () => {
                return Promise.all([
                  downloadGeoTIFF(dataLayers.maskUrl),
                  downloadGeoTIFF(dataLayers.monthlyFluxUrl)
                ]);
              },
              hourlyShade: async () => {
                return Promise.all([
                  downloadGeoTIFF(dataLayers.maskUrl),
                  ...dataLayers.hourlyShadeUrls.map((url: string) => downloadGeoTIFF(url))
                ]);
              },
            }

            await Promise.all(layerIds.map(async (layerId) => {
              inputTiffs[layerId] = await getLayers[layerId]();
            }));

          } catch (error) {
            // Handle any errors here
            console.error('Failed to fetch coordinates:', error);
          }

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
                    toolName: 'retrievePrograms',
                    toolCallId,
                    args: { address }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'retrievePrograms',
                    toolCallId,
                    result: { layerIds, inputTiffs }
                  }
                ]
              }
            ]
          })

          return (
            // TODO use list dropdown to select layer
            <BotCard>
              {/* pass in solar cost into UI element */}
              <SolarStats solarData={{
                maxSunshineHoursPerYear: stats["solarPotential"]["maxSunshineHoursPerYear"] ?? 0,
                maxArrayAreaMeters2: stats["solarPotential"]["maxArrayAreaMeters2"] ?? 0,
              }}
                panelData={{
                  panelsCount: stats["solarPotential"]["maxArrayPanelsCount"] ?? 0,
                  panelCapacityWatts: stats["solarPotential"]["panelCapacityWatts"] ?? 0
                }} />
              <MapDataCanvas data={inputTiffs} layerIds={layerIds} />
            </BotCard>
          )
        }
      },
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

