import http from "http";
import path from "path";
import BaseLogger from "./utils/logger";
import createApp from "./app";
import createControllers from "./createControllers";
import { initPostgresDatabase, initRedisDatabase } from "./initDatastores";
import { setupSocketIO } from "./websockets/initSocket";
import { verifyEnvVars } from "./utils/verifyEnvVars";
import { getSessionSetupOptions } from "./utils/getSessionSetupOptions";

export default async function createServer() {
  verifyEnvVars();
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
  // if (process.env.ENVIRONMENT === "local") {
  //   await redisClient.flushAll();
  // }
  const controllers = await createControllers({
    logger,
    sequelize,
    redisClient,
    lobbyModel,
    gameModel,
  });
  const sessionOptions = getSessionSetupOptions(redisClient);
  const app = await createApp(logger, controllers, sessionOptions);
  const server = http.createServer(app);

  setupSocketIO({
    httpServer: server,
    logger,
    lobbyController: controllers.lobbyController,
    gameController: controllers.gameController,
    redisClient,
    sessionOptions,
  });

  return server;
}
