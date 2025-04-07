import { Server, ServerOptions } from "socket.io";
import http from "http";
import GameChannel from "./channels/gameChannel";
import LobbyChannel from "./channels/lobbyChannel";
import BaseLogger from "../utils/logger";
import { RedisClient } from "../initDatastores";
import session, { SessionOptions } from "express-session";
import LobbyController from "../controllers/lobbyController";
import GameController from "../controllers/gameController";
import { UserSessionStore } from "../models/redis/UserSessionStore";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wrap = (middleware: any) => (socket: any, next: any) =>
  middleware(socket.request, {}, next);

export function setupSocketIO(params: {
  httpServer: http.Server;
  logger: BaseLogger;
  redisClient: RedisClient;
  lobbyController: LobbyController;
  gameController: GameController;
  userSessionStore: UserSessionStore;
  sessionOptions: SessionOptions;
}) {
  const {
    httpServer,
    logger,
    lobbyController,
    gameController,
    userSessionStore,
    sessionOptions,
  } = params;

  const ioOptions: Partial<ServerOptions> = {};
  if (process.env.ENVIRONMENT === "production") {
    ioOptions.cors = {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    };
  } else {
    ioOptions.cors = {
      origin: "*",
      credentials: false,
    };
  }
  const io = new Server(httpServer, ioOptions);
  io.use(wrap(session(sessionOptions)));
  io.use((socket, next) => {
    const session = socket.request.session;
    if (!session.user) {
      next(new Error("User not authenticated"));
    } else {
      next();
    }
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
    const userId = session.user.id;
    logger.debug(`Session: (${JSON.stringify(session)})`);
    if (session.lobbyId !== "none") {
      socket.join(session.lobbyId);
    }

    socket.join(userId);

    lobbyChannel.registerEvents(socket);
    gameChannel.registerEvents(socket);

    logger.info(`User socket connected: (${socket.id}) (User ID: ${userId})`);

    socket.on("disconnect", async () => {
      logger.info(
        `User socket disconnected: (${socket.id}) User ID: (${userId})`,
      );
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
