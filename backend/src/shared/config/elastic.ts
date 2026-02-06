import "dotenv/config";
import { Client } from "@elastic/elasticsearch";
const { ELASTIC_NODE, ELASTIC_API_KEY } = process.env;

if (!ELASTIC_NODE || !ELASTIC_API_KEY) {
  throw new Error("ELASTIC_NODE is not defined");
}

export const elasticClient = new Client({
  node: ELASTIC_NODE,
  auth: {
    apiKey: ELASTIC_API_KEY,
  },
  maxRetries: 5,
  requestTimeout: 30_000,
  sniffOnStart: false,
  tls: {
    rejectUnauthorized: false,
  },
});


