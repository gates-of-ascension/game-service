import { Sequelize } from "@sequelize/core";
import User from "./models/postgres/User";
import { PostgresDialect } from "@sequelize/postgres";
import UserDeck from "./models/postgres/UserDeck";
import UserDeckCard from "./models/postgres/UserDeckCard";
import Card from "./models/postgres/Card";
import BaseLogger from "./utils/logger";
import { createClient } from "redis";
import { LobbyModel } from "./models/redis/LobbyModel";
import { GameModel } from "./models/redis/GameModel";
import { Game } from "./models/postgres/Game";
import { GamePlayer } from "./models/postgres/GamePlayer";
import { GameStateHistory } from "./models/postgres/GameStateHistory";

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
    models: [
      User,
      UserDeck,
      UserDeckCard,
      Card,
      Game,
      GamePlayer,
      GameStateHistory,
    ],
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
  logger.info("Connecting to Redis...");
  try {
    await redisClient.connect();
    logger.info("Redis connected!");
  } catch (err) {
    logger.error(JSON.stringify(err));
    throw err;
  }
  return {
    redisClient: redisClient as RedisClient,
    lobbyModel: new LobbyModel(redisClient, logger),
    gameModel: new GameModel(redisClient, logger),
  };
}
