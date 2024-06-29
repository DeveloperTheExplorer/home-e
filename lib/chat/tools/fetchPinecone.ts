import OpenAI from 'openai';
const { Pinecone } = require('@pinecone-database/pinecone');

const EMBEDDING_DIM = 1536;  // dimensionality of text-embedding-ada-002
const EMBED_MODEL = "text-embedding-ada-002";

export async function getEmbedding(text) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: text,
  });

  return response.data[0].embedding;
}

export async function fetchDSIRE(queryText) {
  const queryVector = await getEmbedding(queryText);
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
  });

  const response = await pinecone.listIndexes()

  const index = pinecone.index("dsire-programs");
  const queryResponse = await index.query({
    vector: queryVector,
    topK: 10,
    includeMetadata: true
  });

  return queryResponse;
}