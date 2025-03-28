import http from "http";
import path from "path";
import BaseLogger from "./utils/logger";
import createApp from "./app";
import createControllers from "./createControllers";
import initDatabase from "./init-database";

export default async function createServer() {
  const logger = new BaseLogger(path.join(__dirname, "app.log"));
  await initDatabase(logger, process.env.POSTGRES_URL!);
  const controllers = await createControllers({ logger });
  const app = await createApp(logger, controllers);
  const server = http.createServer(app);

  return server;
}
