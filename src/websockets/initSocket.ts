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
import { socketErrorMiddleware } from "../middleware/apiError";
// import { StreamConsumer } from "../streams/streamConsumer";
// import { SocketRoomManager } from "./socketRoomManager";
import { StreamPublisher } from "../streams/streamPublisher";

export async function setupSocketIO(params: {
  httpServer: http.Server;
  logger: BaseLogger;
  redisClient: RedisClient;
  lobbyController: LobbyController;
  gameController: GameController;
  userSessionStore: UserSessionStore;
  streamPublisher: StreamPublisher;
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
    origin: process.env.FRONTEND_URL,
    credentials: true,
  };
  const io = new Server(httpServer, ioOptions);

  io.engine.use(sessionMiddleware);

  io.use(socketErrorMiddleware(logger));

  io.use(async (socket, next) => {
    const session = socket.request.session;
    if (!session?.user) {
      next(new Error("User not authenticated"));
      return;
    }

    let userActiveSocket;
    try {
      userActiveSocket = await userSessionStore.getUserActiveSocket(
        session.user.id,
      );
    } catch (error) {
      logger.error(
        `Error getting user socket for user ID ${session.user.id}: ${error}`,
      );
      next(new Error("User could not be authenticated due to error"));
      return;
    }

    if (userActiveSocket) {
      next(new Error("User already connected"));
      return;
    }
    next();
  });

  const lobbyChannel = new LobbyChannel(
    logger,
    io,
    lobbyController,
    userSessionStore,
  );
  const gameChannel = new GameChannel(
    logger,
    io,
    gameController,
    lobbyController,
  );

  io.on("connection", async (socket) => {
    const session = socket.request.session;
    if (!session?.user) {
      socket.disconnect();
      return;
    }

    const { id: userId, username } = session.user;

    try {
      logger.debug(
        `User (${username}) connected to websocket with session: (${JSON.stringify(
          session,
        )})`,
      );

      if (session.lobbyId !== "none") {
        socket.join(session.lobbyId);
      }

      if (session.gameId !== "none") {
        socket.join(session.gameId);
      }

      socket.join(userId);

      lobbyChannel.registerEvents(socket);
      gameChannel.registerEvents(socket);

      await userSessionStore.setUserActiveSocket(userId, socket.id);
      logger.info(`User socket connected: (${socket.id}) (User ID: ${userId})`);
    } catch (error) {
      logger.error(`Error during socket connection setup: ${error}`);
      socket.emit("connect_error", {
        message: "Error setting up socket connection",
      });
      socket.disconnect();
    }

    socket.on("disconnect", async () => {
      if (!session?.user) return;

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

  // const socketRoomManager = new SocketRoomManager({
  //   logger,
  //   io,
  //   userSessionStore,
  // });

  // const streamConsumer = new StreamConsumer({
  //   logger,
  //   redisClient,
  //   consumerName: "websocket-servers",
  //   io,
  //   socketRoomManager,
  // });

  // await streamConsumer.start();

  return {
    io,
    channels: {
      lobbyChannel,
      gameChannel,
    },
  };
}
