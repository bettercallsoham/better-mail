import "dotenv/config";
import OpenAI from "openai";
import { AzureChatOpenAI } from "@langchain/openai";

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

export const gpt41LLM = new AzureChatOpenAI({
  azureOpenAIApiKey: AZURE_OPEN_AI_KEY!,
  azureOpenAIApiInstanceName: GPT_41_ENDPOINT!
    .split("https://")[1]
    .split(".openai.azure.com")[0],
  azureOpenAIApiDeploymentName: GPT_41_MODEL!,
  azureOpenAIApiVersion: GPT_41_API_VERSION!,
  temperature: 0.3,
  streaming: true,
});

export const gpt4oMiniLLM = new AzureChatOpenAI({
  azureOpenAIApiKey: AZURE_OPEN_AI_KEY!,
  azureOpenAIApiInstanceName: GPT_4O_MINI_ENDPOINT!
    .split("https://")[1]
    .split(".openai.azure.com")[0],
  azureOpenAIApiDeploymentName: GPT_4O_MINI_MODEL!,
  azureOpenAIApiVersion: GPT_4O_MINI_VERSION!,
  temperature: 0.3,
  streaming: true,
});
