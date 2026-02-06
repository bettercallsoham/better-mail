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
      rejectUnauthorized: false,
    },
  },

  pool: {
    max: 10,
    min: 0,
    idle: 10000,
    acquire: 60000,
  },
});

const connectDb = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    logger.info("Db Connected Succesfully");
  } catch (error: any) {
    console.log(error);
    logger.error("Error while connecting db :" + error);
    process.exit(1);
  }
};

export { connectDb, sequelize };
