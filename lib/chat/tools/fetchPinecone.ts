// import OpenAI from 'openai';
// const { Pinecone } = require('@pinecone-database/pinecone');
// import { IncentiveCategory, Sector, State } from '@/lib/types'

// const EMBEDDING_DIM = 1536;  // dimensionality of text-embedding-ada-002
// const EMBED_MODEL = "text-embedding-ada-002";

// export async function getEmbedding(text: string) {
//   const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
//   });

//   const response = await openai.embeddings.create({
//     model: EMBED_MODEL,
//     input: text,
//   });

//   return response.data[0].embedding;
// }

// export async function fetchDSIRE(queryText: string, onlyState?: State, onlySector?: Sector, onlyCategory?: IncentiveCategory) {
//   const queryVector = await getEmbedding(queryText);
//   const pinecone = new Pinecone({
//     apiKey: process.env.PINECONE_API_KEY
//   });

//   const index = pinecone.index("dsire-programs");
//   const filter: { [x: string]: { $eq: string; }; } = {};
//   if (onlyState) {
//     const stateCode =
//       Object.keys(State)[Object.values(State).indexOf(onlyState)]
//     filter['state'] = { $eq: stateCode }
//   }
//   if (onlySector) {
//     filter['sector'] = {'$eq': onlySector };
//   }
//   if (onlyCategory) {
//     filter['category'] = { '$eq': onlyCategory }
//   }
//   const queryResponse = await index.query({
//     vector: queryVector,
//     topK: 10,
//     includeMetadata: true,
//     filter,
//   });

//   return queryResponse;
// }