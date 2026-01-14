import Redis from "ioredis";
import { logger } from "../utils/logger";
import "dotenv/config";

const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = process.env;

if (!REDIS_HOST || !REDIS_PORT || !REDIS_PASSWORD) {
  throw new Error("Please provide Redis credentials in .env");
}

const redisConfig = {
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn("Redis retrying connection...");
    return delay;
  },
};

export const redis = new Redis(redisConfig);

export const redisPubSub = new Redis(redisConfig);

redis.on("connect", () => logger.info("Main Redis connected"));
redis.on("ready", () => logger.info(" Main Redis ready"));
redis.on("error", (err: { message: string }) =>
  logger.error(" Main Redis error:" + err.message)
);

redisPubSub.on("connect", () => logger.info("Pub/Sub Redis connected"));
redisPubSub.on("ready", () => logger.info("Pub/Sub Redis ready"));
redisPubSub.on("error", (err: { message: string }) =>
  logger.error(" Pub/Sub Redis error:" + err.message)
);

export default redis;
