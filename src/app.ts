import express from "express";
import BaseLogger from "./utils/logger";
import usersRouter from "./routes/users";
import "express-async-errors";
import { Controllers } from "./createControllers";
import { apiErrorMiddleware } from "./middleware/apiError";
import cardsRouter from "./routes/cards";
import userDecksRouter from "./routes/userDecks";
export default async function createApp(
  logger: BaseLogger,
  controllers: Controllers,
) {
  const app = express();
  const { usersController, cardsController, userDecksController } = controllers;
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  app.use("/", usersRouter(usersController));
  app.use("/", cardsRouter(cardsController));
  app.use("/", userDecksRouter(userDecksController));

  app.use(apiErrorMiddleware(logger));

  return app;
}
