import { Server, ServerOptions } from "socket.io";
import http from "http";
import GameChannel from "./channels/gameChannel";
import LobbyChannel from "./channels/lobbyChannel";
import BaseLogger from "../utils/logger";
import { RedisClient } from "../initDatastores";
import { RedisStore } from "connect-redis";
import session, { SessionOptions } from "express-session";
import LobbyController from "../controllers/lobbyController";
import GameController from "../controllers/gameController";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wrap = (middleware: any) => (socket: any, next: any) =>
  middleware(socket.request, {}, next);

export function setupSocketIO(params: {
  httpServer: http.Server;
  logger: BaseLogger;
  redisClient: RedisClient;
  sessionOptions: SessionOptions;
  lobbyController: LobbyController;
  gameController: GameController;
}) {
  const {
    httpServer,
    logger,
    redisClient,
    sessionOptions,
    lobbyController,
    gameController,
  } = params;

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
    redisStore,
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

    try {
      await redisClient.set(`user_socket_${userId}`, socket.id);
    } catch (error) {
      logger.error(
        `Error setting user socket (${userId}) in redis: (${error})`,
      );
    }

    socket.join(userId);

    lobbyChannel.registerEvents(socket);
    gameChannel.registerEvents(socket);

    logger.info(`User socket connected: (${socket.id}) (User ID: ${userId})`);

    socket.on("disconnect", async () => {
      logger.info(
        `User socket disconnected: (${socket.id}) User ID: (${userId})`,
      );

      try {
        await redisClient.del(`user_socket_${userId}`);
      } catch (error) {
        logger.error(
          `Error deleting user socket (${userId}) from redis: (${error})`,
        );
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
