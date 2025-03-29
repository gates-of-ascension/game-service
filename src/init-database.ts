import { Sequelize } from "@sequelize/core";
import User from "./models/User";
import { PostgresDialect } from "@sequelize/postgres";
import UserDeck from "./models/UserDeck";
import UserDeckCard from "./models/UserDeckCard";
import Card from "./models/Card";
import BaseLogger from "./utils/logger";

export type InitDatabaseOptions = {
  logger: BaseLogger;
  databaseInfo: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
};

export default async function initDatabase(options: InitDatabaseOptions) {
  const { logger, databaseInfo } = options;
  const sequelize = new Sequelize({
    dialect: PostgresDialect,
    host: databaseInfo.host,
    port: databaseInfo.port,
    user: databaseInfo.user,
    password: databaseInfo.password,
    database: databaseInfo.database,
    models: [User],
    schema: "public",
    logging: (sql) => logger.info(sql),
  });
  logger.info("Connecting to database...");

  await sequelize.authenticate();
  logger.info("Database connected!");
  await sequelize.sync();
  logger.info("Database synced!");
}
