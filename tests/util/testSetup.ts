import {
  initPostgresDatabase,
  initRedisDatabase,
} from "../../src/initDatastores";
import BaseLogger from "../../src/utils/logger";
import "./envVariables";
import path from "path";
import createApp from "../../src/app";
import createControllers from "../../src/createControllers";

export default async function setupTestEnvironment() {
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

  const { redisClient, lobbyModel } = await initRedisDatabase({
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

  return {
    logger,
    app,
    redisClient,
  };
}
