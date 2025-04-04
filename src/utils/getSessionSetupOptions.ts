import { RedisStore } from "connect-redis";
import { RedisClient } from "../initDatastores";
import { v4 as uuidv4 } from "uuid";
import { CookieOptions } from "express";

export function getSessionSetupOptions(redisClient: RedisClient) {
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

  return sessionOptions;
}
