import "dotenv/config";
import OpenAI from "openai";

export const {
  AZURE_OPEN_AI_KEY,
  GPT_41_ENDPOINT,
  GPT_41_MODEL,
  GPT_41_API_VERSION,
  GPT_4O_MINI_ENDPOINT,
  GPT_4O_MINI_MODEL,
  GPT_4O_MINI_VERSION,
  EMBEDDINGS_ENDPOINT,
  EMBEDDINGS_MODEL_NAME,
  EMBEDDINGS_MODEL_DEPLOYMENT,
} = process.env;

export const azureClient41 = new OpenAI({
  apiKey: AZURE_OPEN_AI_KEY,
  baseURL: GPT_41_ENDPOINT,
  defaultQuery: {
    "api-version": GPT_41_API_VERSION,
  },
  defaultHeaders: {
    "api-key": AZURE_OPEN_AI_KEY!,
  },
});

export const azureClient4o_mini = new OpenAI({
  apiKey: AZURE_OPEN_AI_KEY,
  baseURL: GPT_4O_MINI_ENDPOINT,
  defaultQuery: {
    "api-version": GPT_4O_MINI_VERSION,
  },
  defaultHeaders: {
    "api-key": AZURE_OPEN_AI_KEY!,
  },
});

export const embeddingsClient = new OpenAI({
  apiKey: AZURE_OPEN_AI_KEY,
  baseURL: EMBEDDINGS_ENDPOINT,
  defaultQuery: {
    "api-version": GPT_4O_MINI_VERSION,
  },
  defaultHeaders: {
    "api-key": AZURE_OPEN_AI_KEY!,
  },
});
