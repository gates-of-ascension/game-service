import { Sequelize } from "@sequelize/core";
import User from "./models/User";
import { PostgresDialect } from "@sequelize/postgres";
import UserDeck from "./models/UserDeck";
import UserDeckCard from "./models/UserDeckCard";
import Card from "./models/Card";
import BaseLogger from "./utils/logger";
import { createClient } from "redis";

export type InitPostgresDatabaseOptions = {
  logger: BaseLogger;
  databaseInfo: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
};

export type InitRedisOptions = {
  logger: BaseLogger;
  redisInfo: {
    host: string;
    port: number;
  };
};

export type RedisClient = ReturnType<typeof createClient>;

export async function initPostgresDatabase(
  options: InitPostgresDatabaseOptions,
) {
  const { logger, databaseInfo } = options;
  const sequelize = new Sequelize({
    dialect: PostgresDialect,
    host: databaseInfo.host,
    port: databaseInfo.port,
    user: databaseInfo.user,
    password: databaseInfo.password,
    database: databaseInfo.database,
    models: [User, UserDeck, UserDeckCard, Card],
    schema: "public",
    define: {
      noPrimaryKey: true,
    },
    logging: (sql) => logger.info(sql),
  });
  logger.info("Connecting to database...");

  await sequelize.authenticate();
  logger.info("Database connected!");
  await sequelize.sync();
  logger.info("Database synced!");
  return sequelize;
}

export async function initRedisDatabase(options: InitRedisOptions) {
  const { logger, redisInfo } = options;
  const redisClient = createClient({
    url: `redis://${redisInfo.host}:${redisInfo.port}`,
  });
  redisClient.on("error", (err) => logger.error(err));
  logger.info("Connecting to Redis...");
  await redisClient.connect();
  logger.info("Redis connected!");
  return redisClient as RedisClient;
}
