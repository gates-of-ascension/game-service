import { v4 as uuidv4 } from "uuid";
import { CookieOptions } from "express";
import { UserSessionStore } from "../models/redis/UserSessionStore";

export function getSessionSetupOptions(userSessionStore: UserSessionStore) {
  const sessionOptions = {
    store: userSessionStore,
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.ENVIRONMENT === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    } as CookieOptions,
    genid: () => uuidv4(),
  };

  return sessionOptions;
}
