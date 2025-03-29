import http from "http";
import path from "path";
import BaseLogger from "./utils/logger";
import createApp from "./app";
import createControllers from "./createControllers";
import initDatabase from "./initDatabase";

export default async function createServer() {
  const logger = new BaseLogger(path.join(__dirname, "app.log"));
  await initDatabase({
    logger,
    databaseInfo: {
      host: process.env.POSTGRES_HOST!,
      port: parseInt(process.env.POSTGRES_PORT!),
      user: process.env.POSTGRES_USER!,
      password: process.env.POSTGRES_PASSWORD!,
      database: process.env.POSTGRES_DB!,
    },
  });
  const controllers = await createControllers({ logger });
  const app = await createApp(logger, controllers);
  const server = http.createServer(app);

  return server;
}
