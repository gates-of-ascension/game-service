import { Server, ServerOptions } from "socket.io";
import http from "http";
import GameChannel from "./channels/gameChannel";
import LobbyChannel from "./channels/lobbyChannel";
import { LobbyModel } from "../models/redis/LobbyModel";
import { GameModel } from "../models/redis/GameModel";
import BaseLogger from "../utils/logger";
import { RedisClient } from "../initDatastores";
import { RedisStore } from "connect-redis";
import { parse } from "cookie";

export const userSocketMap = new Map<string, string[]>();

export function setupSocketIO(params: {
  httpServer: http.Server;
  logger: BaseLogger;
  lobbiesModel: LobbyModel;
  gamesModel: GameModel;
  redisClient: RedisClient;
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

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error("No session cookie"));
      }

      const cookies = parse(cookieHeader);
      const sessionId = cookies["connect.sid"]?.split(".")[0].substring(2);

      logger.info(`Session ID: ${sessionId}`);

      if (!sessionId) {
        return next(new Error("Session ID not found"));
      }

      redisStore.get(sessionId, (err, sessionData) => {
        if (err || !sessionData) {
          return next(new Error("Invalid session"));
        }

        const userId = sessionData.userId;

        if (!userId) {
          return next(new Error("Not authenticated"));
        }

        socket.data.userId = userId;

        if (!userSocketMap.has(userId)) {
          userSocketMap.set(userId, []);
        }
        userSocketMap.get(userId)?.push(socket.id);

        next();
      });
    } catch (error) {
      logger.error(`Socket authentication error: (${error})`);
      next(new Error("Authentication error"));
    }
  });

  const lobbyChannel = new LobbyChannel(logger, io, lobbiesModel, gamesModel);
  const gameChannel = new GameChannel(logger, io, gamesModel);

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    logger.info(`User connected: ${socket.id} (User ID: ${userId})`);

    socket.join(userId);

    lobbyChannel.registerEvents(socket);
    gameChannel.registerEvents(socket);

    socket.on("disconnect", () => {
      logger.info(`User disconnected: ${socket.id} (User ID: ${userId})`);

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
