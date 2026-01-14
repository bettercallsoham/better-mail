import "dotenv/config";
import { Sequelize } from "sequelize";
import { logger } from "../utils/logger";

const { PG_CONNECTION_STRING } = process.env;

if (!PG_CONNECTION_STRING) {
  throw new Error("No postgres Connection string found");
}

const sequelize = new Sequelize(PG_CONNECTION_STRING!, {
  dialect: "postgres",
  define: {
    freezeTableName: true,
  },
  logging: false,
  dialectOptions: {
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    ssl: {
      require: true,
      rejectUnauthorized: true,
    },
  },

  pool: {
    max: 250,
    min: 0,
    idle: 10000,
    acquire: 600000,
  },
});

const connectDb = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info("Db Connected Succesfully");
  } catch (error: any) {
    logger.error("Error while connecting db :" + error.message);
    process.exit(1);
  }
};

export { connectDb, sequelize };
