import http from "http";
import path from "path";
import BaseLogger from "./utils/logger";
import createApp from "./app";
import createControllers from "./createControllers";
import { initPostgresDatabase, initRedisDatabase } from "./initDatastores";
import { setupSocketIO } from "./websockets/initSocket";

export default async function createServer() {
  const logger = new BaseLogger(path.join(__dirname, "app.log"));
  const sequelize = await initPostgresDatabase({
    logger,
    databaseInfo: {
      host: process.env.POSTGRES_HOST!,
      port: parseInt(process.env.POSTGRES_PORT!),
      user: process.env.POSTGRES_USER!,
      password: process.env.POSTGRES_PASSWORD!,
      database: process.env.POSTGRES_DB!,
    },
  });
  const { redisClient, lobbyModel, gameModel } = await initRedisDatabase({
    logger,
    redisInfo: {
      host: process.env.REDIS_HOST!,
      port: parseInt(process.env.REDIS_PORT!),
    },
  });
  const controllers = await createControllers({
    logger,
    sequelize,
    redisClient,
    lobbyModel,
  });
  const app = await createApp(logger, controllers, redisClient);
  const server = http.createServer(app);

  setupSocketIO({
    httpServer: server,
    logger,
    lobbiesModel: lobbyModel,
    gamesModel: gameModel,
    redisClient,
  });

  return server;
}
