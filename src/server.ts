import http from "http";
import path from "path";
import BaseLogger from "./utils/logger";
import createApp from "./app";
import createControllers from "./createControllers";
import { initPostgresDatabase, initRedisDatabase } from "./initDatastores";
import { setupSocketIO } from "./websockets/initSocket";
import { verifyEnvVars } from "./utils/verifyEnvVars";
import { getSessionSetupOptions } from "./utils/getSessionSetupOptions";
import { UserSessionStore } from "./models/redis/UserSessionStore";
import session from "express-session";

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
  const userSessionStore = new UserSessionStore({
    client: redisClient,
    prefix: "session:",
    logger,
    lobbyModel,
  });
  const controllers = await createControllers({
    logger,
    sequelize,
    redisClient,
    lobbyModel,
    gameModel,
    userSessionStore,
  });
  const sessionOptions = getSessionSetupOptions(userSessionStore);
  const sessionMiddleware = session(sessionOptions);
  const app = await createApp(logger, controllers, sessionMiddleware);
  const server = http.createServer(app);

  setupSocketIO({
    httpServer: server,
    logger,
    redisClient,
    sessionMiddleware,
    lobbyController: controllers.lobbyController,
    gameController: controllers.gameController,
    userSessionStore,
  });

  return server;
}
