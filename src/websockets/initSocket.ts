import { Server, ServerOptions } from "socket.io";
import http from "http";
import GameChannel from "./channels/gameChannel";
import LobbyChannel from "./channels/lobbyChannel";
import { LobbyModel } from "../models/redis/LobbyModel";
import { GameModel } from "../models/redis/GameModel";
import BaseLogger from "../utils/logger";
import { RedisClient } from "../initDatastores";
import { RedisStore } from "connect-redis";
import session, { SessionOptions } from "express-session";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wrap = (middleware: any) => (socket: any, next: any) =>
  middleware(socket.request, {}, next);
export const userSocketMap = new Map<string, string[]>();

export function setupSocketIO(params: {
  httpServer: http.Server;
  logger: BaseLogger;
  lobbiesModel: LobbyModel;
  gamesModel: GameModel;
  redisClient: RedisClient;
  sessionOptions: SessionOptions;
}) {
  const { httpServer, logger, lobbiesModel, gamesModel, redisClient } = params;

  const redisStore = new RedisStore({
    client: redisClient,
    prefix: "session",
  });

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
  io.use(wrap(session(params.sessionOptions)));
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
    redisStore,
    lobbiesModel,
    gamesModel,
  );
  const gameChannel = new GameChannel(logger, io, gamesModel);

  io.on("connection", (socket) => {
    const userId = socket.data.userId;

    const session = socket.request.session;
    logger.debug(`Session: (${JSON.stringify(session)})`);
    if (session.lobby !== "none") {
      socket.join(session.lobby.id);
    }

    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, []);
    }
    userSocketMap.get(userId)?.push(socket.id);

    socket.join(userId);

    lobbyChannel.registerEvents(socket);
    gameChannel.registerEvents(socket);

    logger.info(`User socket connected: (${socket.id}) (User ID: ${userId})`);

    socket.on("disconnect", () => {
      logger.info(
        `User socket disconnected: (${socket.id}) User ID: (${userId})`,
      );

      const userSockets = userSocketMap.get(userId);
      if (userSockets) {
        const index = userSockets.indexOf(socket.id);
        if (index !== -1) {
          userSockets.splice(index, 1);
        }
        if (userSockets.length === 0) {
          userSocketMap.delete(userId);
        }
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
