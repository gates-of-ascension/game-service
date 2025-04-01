import express, { CookieOptions } from "express";
import BaseLogger from "./utils/logger";
import usersRouter from "./routes/users";
import "express-async-errors";
import { Controllers } from "./createControllers";
import { RedisClient } from "./initDatastores";
import { apiErrorMiddleware } from "./middleware/apiError";
import cardsRouter from "./routes/cards";
import userDecksRouter from "./routes/userDecks";
import { RedisStore } from "connect-redis";
import session from "express-session";
import { v4 as uuidv4 } from "uuid";

export default async function createApp(
  logger: BaseLogger,
  controllers: Controllers,
  redisClient: RedisClient,
) {
  const app = express();
  const { usersController, cardsController, userDecksController } = controllers;
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  const redisStore = new RedisStore({
    client: redisClient,
    prefix: "session",
  });

  const sessionOptions = {
    store: redisStore,
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {} as CookieOptions,
    genid: () => uuidv4(),
  };

  if (process.env.ENVIRONMENT === "production") {
    app.set("trust proxy", 1);
    sessionOptions.cookie.secure = true;
  } else {
    sessionOptions.cookie.secure = false;
  }

  app.use(session(sessionOptions));

  // Register routes after session middleware
  app.use("/", usersRouter(usersController));
  app.use("/", cardsRouter(cardsController));
  app.use("/", userDecksRouter(userDecksController));

  app.use(apiErrorMiddleware(logger));

  return app;
}
