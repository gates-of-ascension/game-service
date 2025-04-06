import express from "express";
import BaseLogger from "./utils/logger";
import usersRouter from "./routes/users";
import "express-async-errors";
import { Controllers } from "./createControllers";
import { apiErrorMiddleware } from "./middleware/apiError";
import cardsRouter from "./routes/cards";
import userDecksRouter from "./routes/userDecks";
import lobbiesRouter from "./routes/lobbies";
import session, { SessionOptions } from "express-session";

export default async function createApp(
  logger: BaseLogger,
  controllers: Controllers,
  sessionOptions: SessionOptions,
) {
  const app = express();
  const {
    usersController,
    cardsController,
    userDecksController,
    lobbyController,
  } = controllers;
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  if (process.env.ENVIRONMENT === "production") {
    app.set("trust proxy", 1);
    sessionOptions.cookie!.secure = true;
  } else {
    sessionOptions.cookie!.secure = false;
  }

  app.use(session(sessionOptions));

  // Register routes after session middleware
  app.use("/", usersRouter(usersController));
  app.use("/", cardsRouter(cardsController));
  app.use("/", userDecksRouter(userDecksController));
  app.use("/", lobbiesRouter(lobbyController));
  app.use(apiErrorMiddleware(logger));

  return app;
}
