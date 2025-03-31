import initDatabase from "../../src/initDatabase";
import BaseLogger from "../../src/utils/logger";
import "./envVariables";
import path from "path";
import createApp from "../../src/app";
import createControllers from "../../src/createControllers";

export default async function setupTestEnvironment() {
  const logger = new BaseLogger(path.join(__dirname, "app.log"));
  const sequelize = await initDatabase({
    logger,
    databaseInfo: {
      host: process.env.POSTGRES_HOST!,
      port: parseInt(process.env.POSTGRES_PORT!),
      user: process.env.POSTGRES_USER!,
      password: process.env.POSTGRES_PASSWORD!,
      database: process.env.POSTGRES_DB!,
    },
  });

  const controllers = await createControllers({ logger, sequelize });
  const app = await createApp(logger, controllers);

  return {
    logger,
    app,
  };
}
