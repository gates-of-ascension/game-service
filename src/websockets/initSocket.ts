import { Server, ServerOptions } from "socket.io";
import http from "http";
import GameChannel from "./channels/gameChannel";
import LobbyChannel from "./channels/lobbyChannel";
import BaseLogger from "../utils/logger";
import { RedisClient } from "../initDatastores";
import LobbyController from "../controllers/lobbyController";
import GameController from "../controllers/gameController";
import { UserSessionStore } from "../models/redis/UserSessionStore";
import { RequestHandler } from "express";

export function setupSocketIO(params: {
  httpServer: http.Server;
  logger: BaseLogger;
  redisClient: RedisClient;
  lobbyController: LobbyController;
  gameController: GameController;
  userSessionStore: UserSessionStore;
  sessionMiddleware: RequestHandler;
}) {
  const {
    httpServer,
    logger,
    lobbyController,
    gameController,
    userSessionStore,
    sessionMiddleware,
  } = params;

  const ioOptions: Partial<ServerOptions> = {};
  ioOptions.cors = {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    exposedHeaders: ["Set-Cookie"],
  };
  const io = new Server(httpServer, ioOptions);
  io.engine.use(sessionMiddleware);
  io.use(async (socket, next) => {
    const session = socket.request.session;
    if (!session.user) {
      next(new Error("User not authenticated"));
    }
    next();
  });

  io.use(async (socket, next) => {
    const session = socket.request.session;
    let userActiveSocket;
    try {
      userActiveSocket = await userSessionStore.getUserActiveSocket(
        session.user.id,
      );
    } catch (error) {
      logger.error(
        `Error getting user socket (${session.user.username}): (${error})`,
      );
      next(new Error("User could not be authenticated due to error"));
    }
    if (userActiveSocket) {
      next(new Error("User already connected"));
    }
    next();
  });

  const lobbyChannel = new LobbyChannel(
    logger,
    io,
    userSessionStore,
    lobbyController,
  );
  const gameChannel = new GameChannel(logger, io, gameController);

  io.on("connection", async (socket) => {
    const session = socket.request.session;
    const { id: userId, username } = session.user;

    logger.debug(
      `User (${username}) connected to websocket with session: (${JSON.stringify(
        session,
      )})`,
    );
    if (session.lobbyId !== "none") {
      socket.join(session.lobbyId);
    }

    socket.join(userId);

    lobbyChannel.registerEvents(socket);
    gameChannel.registerEvents(socket);

    try {
      await userSessionStore.setUserActiveSocket(userId, socket.id);
    } catch (error) {
      logger.error(`Error setting user socket (${username}): (${error})`);
      socket.emit("connect_error", {
        message: "Error setting user socket in redis",
      });
    }

    logger.info(`User socket connected: (${socket.id}) (User ID: ${userId})`);

    socket.on("disconnect", async () => {
      logger.info(
        `User socket disconnected: (${socket.id}) User ID: (${userId})`,
      );

      try {
        await userSessionStore.deleteUserActiveSocket(userId);
      } catch (error) {
        logger.error(`Error deleting user socket (${username}): (${error})`);
      }
    });
  });

  return {
    io,
    channels: {
      lobbyChannel,
      gameChannel,
    },
  };
}
