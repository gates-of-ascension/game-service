import { expect } from "@jest/globals";
import setupTestEnvironment from "../../util/testSetup";
import { Express } from "express";
import { createUserClientSocket } from "../../util/authHelper";
import { RedisClient } from "../../../src/initDatastores";
import { io as ioc } from "socket.io-client";
import { LobbyModel } from "../../../src/models/redis/LobbyModel";
import { UserSessionStore } from "../../../src/models/redis/UserSessionStore";
import Sequelize from "@sequelize/core";
import http from "http";
import { loginAndCreateSocket } from "../../util/authHelper";
import {
  createLobby,
  joinLobby,
  expectLobbyState,
  setUserReady,
  waitForMultipleSocketsAndEvents,
} from "../../util/websocketUtils";
import { cleanupDataStores } from "../../util/dataStoreCleanup";
import { GameModel } from "../../../src/models/redis/GameModel";

describe("Lobbies", () => {
  let app: Express;
  let redisClient: RedisClient;
  let server: http.Server;
  let lobbyModel: LobbyModel;
  let gameModel: GameModel;
  let userSessionStore: UserSessionStore;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let sequelize: Sequelize;

  beforeAll(async () => {
    const {
      app: testApp,
      redisClient: testRedisClient,
      server: testServer,
      userSessionStore: testUserSessionStore,
      lobbyModel: testLobbyModel,
      sequelize: testSequelize,
      gameModel: testGameModel,
    } = await setupTestEnvironment();
    app = testApp;
    redisClient = testRedisClient;
    server = testServer;
    lobbyModel = testLobbyModel;
    gameModel = testGameModel;
    userSessionStore = testUserSessionStore;
    sequelize = testSequelize;
    await cleanupDataStores(redisClient);
    server.listen(process.env.PORT!);
  });

  beforeEach(async () => {
    await cleanupDataStores(redisClient);
  });

  describe("connection", () => {
    it("should fail if the user does not have a valid session", async () => {
      const socketOptions = {
        transportOptions: {
          polling: {
            extraHeaders: {
              Cookie: "connect.sid=invalid",
            },
          },
        },
      };
      const socket = ioc(
        `http://localhost:${process.env.PORT!}`,
        socketOptions,
      );
      socket.emit("create_lobby", {
        name: "Test Lobby",
      });

      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "connect_error",
        },
      ]);
    });

    it("should fail if the user is already connected to the websocket", async () => {
      const { socket: socket1, authCookie } = await loginAndCreateSocket(app);
      socket1.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "connect",
        },
      ]);

      const socket2 = await createUserClientSocket(authCookie);
      socket2.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket2,
          event: "connect_error",
        },
      ]);
      expect(socket2).toBeDefined();
      expect(socket2.connected).toBe(false);
      expect(socket1.connected).toBe(true);
    });

    it("should connect to the websocket with a valid session", async () => {
      const { socket, user } = await loginAndCreateSocket(app);
      socket.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "connect",
        },
      ]);

      expect(socket).toBeDefined();
      expect(socket.connected).toBe(true);
      const sessionId = await userSessionStore.getUserActiveSession(user.id);
      if (!sessionId) {
        throw new Error("No session id found");
      }
      const userSession = await userSessionStore.getUserSession(sessionId);
      expect(userSession).not.toBeNull();
      expect(userSession?.lobbyId).toBe("none");

      const sessionSocketId = await userSessionStore.getUserActiveSocket(
        user.id,
      );
      expect(sessionSocketId).toBe(socket.id);
    });
  });

  describe("create lobby", () => {
    it("should return a validation error if the lobby name is not provided", async () => {
      const { socket, user } = await loginAndCreateSocket(app);

      socket.emit("create_lobby", {
        name: "",
      });

      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "validation_error",
        },
      ]);
      const sessionId = await userSessionStore.getUserActiveSession(user.id);
      if (!sessionId) {
        throw new Error("No session id found");
      }
      const userSession = await userSessionStore.getUserSession(sessionId);
      expect(userSession).not.toBeNull();
      expect(userSession?.lobbyId).toBe("none");
    });

    it("should create a lobby and add the user to the lobby as an owner in redis", async () => {
      const { socket, user } = await loginAndCreateSocket(app);
      socket.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "connect",
        },
      ]);
      const sessionId = await userSessionStore.getUserActiveSession(user.id);
      if (!sessionId) {
        throw new Error("No session id found");
      }

      await createLobby(socket, "Test Lobby");

      const userSession = await userSessionStore.getUserSession(sessionId);
      expect(userSession).not.toBeNull();
      expect(userSession?.lobbyId).not.toBe("none");

      await expectLobbyState(lobbyModel, userSession!.lobbyId!, {
        name: "Test Lobby",
        ownerId: user.id,
        userCount: 0,
      });
    });
  });

  describe("join lobby", () => {
    it("should return a validation error if the lobby id is not provided", async () => {
      const { socket, user } = await loginAndCreateSocket(app);
      const sessionId = await userSessionStore.getUserActiveSession(user.id);
      if (!sessionId) {
        throw new Error("No session id found");
      }
      const userSession = await userSessionStore.getUserSession(sessionId);
      expect(userSession).not.toBeNull();
      expect(userSession?.lobbyId).toBe("none");

      socket.emit("join_lobby", {
        lobbyId: "",
      });

      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "validation_error",
        },
      ]);
    });

    it("should return a client error if the user is already in the lobby", async () => {
      const { socket: socket1, user: user1 } = await loginAndCreateSocket(app);
      socket1.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "connect",
        },
      ]);

      await createLobby(socket1, "Test Lobby");

      socket1.emit("join_lobby", {
        lobbyId: user1.id,
      });

      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "client_error",
        },
      ]);
    });

    it("should return a client error if trying to join a full lobby", async () => {
      const { socket: socket1, user: user1 } = await loginAndCreateSocket(app);
      socket1.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "connect",
        },
      ]);

      await createLobby(socket1, "Test Lobby");

      const sessionId1 = await userSessionStore.getUserActiveSession(user1.id);
      if (!sessionId1) {
        throw new Error("No session id found");
      }
      const userSession1 = await userSessionStore.getUserSession(sessionId1);
      expect(userSession1).not.toBeNull();
      expect(userSession1?.lobbyId).not.toBe("none");

      // Join with second user
      const { socket: socket2 } = await loginAndCreateSocket(app, {
        username: "testuser2",
        displayName: "Test User 2",
      });
      socket2.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket2,
          event: "connect",
        },
      ]);

      await joinLobby(socket2, userSession1!.lobbyId!);

      // Try to join with third user
      const { socket: socket3 } = await loginAndCreateSocket(app, {
        username: "testuser3",
        displayName: "Test User 3",
      });
      socket3.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket3,
          event: "connect",
        },
      ]);

      socket3.emit("join_lobby", { lobbyId: userSession1!.lobbyId! });

      await waitForMultipleSocketsAndEvents([
        {
          socket: socket3,
          event: "server_error",
        },
      ]);
    });

    it("should return a client error if trying to join a lobby when already in another lobby", async () => {
      const { socket: socket1, user: user1 } = await loginAndCreateSocket(app);
      socket1.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "connect",
        },
      ]);

      await createLobby(socket1, "Test Lobby 1");

      const sessionId1 = await userSessionStore.getUserActiveSession(user1.id);
      if (!sessionId1) {
        throw new Error("No session id found");
      }
      const userSession1 = await userSessionStore.getUserSession(sessionId1);
      expect(userSession1).not.toBeNull();
      expect(userSession1?.lobbyId).not.toBe("none");

      // Create second lobby
      const { socket: socket2 } = await loginAndCreateSocket(app, {
        username: "testuser2",
        displayName: "Test User 2",
      });
      socket2.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket2,
          event: "connect",
        },
      ]);

      await createLobby(socket2, "Test Lobby 2");

      const sessionId2 = await userSessionStore.getUserActiveSession(user1.id);
      if (!sessionId2) {
        throw new Error("No session id found");
      }
      const userSession2 = await userSessionStore.getUserSession(sessionId2);
      expect(userSession2).not.toBeNull();
      expect(userSession2?.lobbyId).not.toBe("none");

      // Try to join second lobby while in first lobby
      socket1.emit("join_lobby", { lobbyId: userSession2!.lobbyId! });

      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "client_error",
        },
      ]);
    });

    it("should join a lobby and add the user to the lobby in redis and emit a user_joined event to the lobby", async () => {
      const { socket: socket1, user: user1 } = await loginAndCreateSocket(app);
      socket1.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "connect",
        },
      ]);

      const { socket: socket2, user: user2 } = await loginAndCreateSocket(app, {
        username: "testuser2",
        displayName: "Test User 2",
      });
      socket2.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket2,
          event: "connect",
        },
      ]);

      await createLobby(socket1, "Test Lobby");

      const sessionId = await userSessionStore.getUserActiveSession(user1.id);
      if (!sessionId) {
        throw new Error("No session id found");
      }
      const userSession = await userSessionStore.getUserSession(sessionId);

      socket2.emit("join_lobby", {
        lobbyId: userSession!.lobbyId!,
      });
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "user_joined",
          message: {
            userId: user2.id,
            displayName: user2.displayName,
          },
        },
        {
          socket: socket2,
          event: "user_joined",
          message: {
            userId: user2.id,
            displayName: user2.displayName,
          },
        },
        {
          socket: socket2,
          event: "lobby_joined",
          message: {
            lobbyId: userSession!.lobbyId!,
          },
        },
      ]);

      const userSession2 = await userSessionStore.getUserSession(sessionId);
      expect(userSession2).not.toBeNull();
      expect(userSession2?.lobbyId).toBe(userSession!.lobbyId);

      await expectLobbyState(lobbyModel, userSession!.lobbyId!, {
        name: "Test Lobby",
        ownerId: user1.id,
        userIds: [user2.id],
        userCount: 1,
      });
    });
  });

  describe("set user ready", () => {
    it("should return a client error if the user is not in the lobby", async () => {
      const { socket } = await loginAndCreateSocket(app);
      socket.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "connect",
        },
      ]);

      socket.emit("set_user_ready", {
        isReady: true,
      });

      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "client_error",
        },
      ]);
    });

    it("should set the owner user as ready in redis", async () => {
      const { socket, user } = await loginAndCreateSocket(app);
      socket.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "connect",
        },
      ]);

      await createLobby(socket, "Test Lobby");

      await setUserReady(socket);

      const sessionId = await userSessionStore.getUserActiveSession(user.id);
      if (!sessionId) {
        throw new Error("No session id found");
      }
      const userSession = await userSessionStore.getUserSession(sessionId);
      expect(userSession).not.toBeNull();
      expect(userSession?.lobbyId).not.toBe("none");

      await expectLobbyState(lobbyModel, userSession!.lobbyId!, {
        name: "Test Lobby",
        isReady: {
          userId: user.id,
          isReady: true,
        },
      });
    });

    it("should return a client error if setting ready status when not in a lobby", async () => {
      const { socket } = await loginAndCreateSocket(app);
      socket.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "connect",
        },
      ]);

      socket.emit("set_user_ready", { isReady: true });

      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "client_error",
        },
      ]);
    });

    it("should allow toggling ready status multiple times", async () => {
      const { socket, user } = await loginAndCreateSocket(app);
      socket.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "connect",
        },
      ]);

      await createLobby(socket, "Test Lobby");

      socket.emit("set_user_ready", { isReady: true });
      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "user_ready",
          message: {
            lobbyId: expect.any(String),
            userId: user.id,
            ready: true,
          },
        },
      ]);

      socket.emit("set_user_ready", { isReady: false });
      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "user_ready",
          message: {
            lobbyId: expect.any(String),
            userId: user.id,
            ready: false,
          },
        },
      ]);
    });

    it("should set the joined user as ready in redis", async () => {
      const { socket, user } = await loginAndCreateSocket(app);
      socket.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "connect",
        },
      ]);

      await createLobby(socket, "Test Lobby");

      const sessionId1 = await userSessionStore.getUserActiveSession(user.id);
      if (!sessionId1) {
        throw new Error("No session id found");
      }
      const userSession1 = await userSessionStore.getUserSession(sessionId1);
      expect(userSession1).not.toBeNull();
      expect(userSession1?.lobbyId).not.toBe("none");

      const { socket: socket2, user: user2 } = await loginAndCreateSocket(app, {
        username: "testuser2",
        displayName: "Test User 2",
      });
      socket2.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket2,
          event: "connect",
        },
      ]);

      await joinLobby(socket2, userSession1!.lobbyId!);

      const sessionId2 = await userSessionStore.getUserActiveSession(user2.id);
      if (!sessionId2) {
        throw new Error("No session id found");
      }
      const userSession2 = await userSessionStore.getUserSession(sessionId2);
      expect(userSession2).not.toBeNull();
      expect(userSession2?.lobbyId).not.toBe("none");

      await setUserReady(socket2);

      await expectLobbyState(lobbyModel, userSession2!.lobbyId!, {
        name: "Test Lobby",
        isReady: {
          userId: user2.id,
          isReady: true,
        },
      });
    });
  });

  describe("leave_current_lobby", () => {
    it("should return a client error if the user is not in the lobby", async () => {
      const { socket } = await loginAndCreateSocket(app);
      socket.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "connect",
        },
      ]);

      socket.emit("leave_current_lobby");

      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "client_error",
        },
      ]);
    });

    it("should remove the owner from the lobby in redis and delete the lobby if there are no users left", async () => {
      const { socket, user } = await loginAndCreateSocket(app);
      socket.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "connect",
        },
      ]);

      await createLobby(socket, "Test Lobby");

      socket.emit("leave_current_lobby");

      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "user_left",
          message: {
            userId: user.id,
            displayName: user.displayName,
          },
        },
        {
          socket,
          event: "user_session_lobby_removed",
        },
      ]);

      const sessionId = await userSessionStore.getUserActiveSession(user.id);
      if (!sessionId) {
        throw new Error("No session id found");
      }
      const userSession = await userSessionStore.getUserSession(sessionId);
      expect(userSession).not.toBeNull();
      expect(userSession?.lobbyId).toBe("none");

      const lobby = await lobbyModel.get(userSession!.lobbyId!);
      expect(lobby).toBeNull();
    });

    it("should remove a user from the lobby in redis and not delete the lobby if the owner is not the user", async () => {
      const { socket: socket1, user: user1 } = await loginAndCreateSocket(app);
      socket1.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "connect",
        },
      ]);

      await createLobby(socket1, "Test Lobby");

      const sessionId1 = await userSessionStore.getUserActiveSession(user1.id);
      if (!sessionId1) {
        throw new Error("No session id found");
      }
      const userSession1 = await userSessionStore.getUserSession(sessionId1);
      expect(userSession1).not.toBeNull();
      expect(userSession1?.lobbyId).not.toBe("none");

      const { socket: socket2, user: user2 } = await loginAndCreateSocket(app, {
        username: "testuser2",
        displayName: "Test User 2",
      });
      socket2.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket2,
          event: "connect",
        },
      ]);

      await joinLobby(socket2, userSession1!.lobbyId!);

      socket2.emit("leave_current_lobby");

      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "user_left",
          message: {
            userId: user2.id,
            displayName: user2.displayName,
          },
        },
        {
          socket: socket2,
          event: "user_left",
          message: {
            userId: user2.id,
            displayName: user2.displayName,
          },
        },
        {
          socket: socket2,
          event: "user_session_lobby_removed",
        },
      ]);

      const sessionId2 = await userSessionStore.getUserActiveSession(user2.id);
      if (!sessionId2) {
        throw new Error("No session id found");
      }
      const userSession2 = await userSessionStore.getUserSession(sessionId2);
      expect(userSession2).not.toBeNull();
      expect(userSession2?.lobbyId).toBe("none");

      const lobby = await lobbyModel.get(userSession1!.lobbyId!);
      expect(lobby).not.toBeNull();
      expect(lobby?.users.length).toBe(0);

      const updatedSession1 = await userSessionStore.getUserSession(sessionId1);
      expect(updatedSession1).not.toBeNull();
      expect(updatedSession1?.lobbyId).toBe(userSession1!.lobbyId);
    });
  });

  describe("start_game", () => {
    it("should return a client error if the user is not in a lobby", async () => {
      const { socket } = await loginAndCreateSocket(app);
      socket.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "connect",
        },
      ]);

      socket.emit("start_game");

      await waitForMultipleSocketsAndEvents([
        {
          socket,
          event: "client_error",
        },
      ]);
    });

    it("should return a client error if the user is not the owner of the lobby", async () => {
      const { socket: socket1, user: user1 } = await loginAndCreateSocket(app);
      socket1.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "connect",
        },
      ]);

      const { socket: socket2 } = await loginAndCreateSocket(app, {
        username: "testuser2",
        displayName: "Test User 2",
      });
      socket2.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket2,
          event: "connect",
        },
      ]);

      await createLobby(socket1, "Test Lobby");

      const sessionId1 = await userSessionStore.getUserActiveSession(user1.id);
      if (!sessionId1) {
        throw new Error("No session id found");
      }
      const userSession1 = await userSessionStore.getUserSession(sessionId1);
      expect(userSession1).not.toBeNull();
      expect(userSession1?.lobbyId).not.toBe("none");

      socket2.emit("start_game");

      await waitForMultipleSocketsAndEvents([
        {
          socket: socket2,
          event: "client_error",
        },
      ]);
    });

    it("should return a client error if the lobby has less than 1 users", async () => {
      const { socket: socket1 } = await loginAndCreateSocket(app);
      socket1.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "connect",
        },
      ]);

      await createLobby(socket1, "Test Lobby");

      socket1.emit("start_game");

      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "client_error",
        },
      ]);
    });

    it("should start a game and add the users to the game in redis", async () => {
      const { socket: socket1, user: user1 } = await loginAndCreateSocket(app);
      socket1.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "connect",
        },
      ]);

      await createLobby(socket1, "Test Lobby");

      const sessionId1 = await userSessionStore.getUserActiveSession(user1.id);
      if (!sessionId1) {
        throw new Error("No session id found");
      }
      const userSession1 = await userSessionStore.getUserSession(sessionId1);
      expect(userSession1).not.toBeNull();
      expect(userSession1?.lobbyId).not.toBe("none");

      const { socket: socket2, user: user2 } = await loginAndCreateSocket(app, {
        username: "testuser2",
        displayName: "Test User 2",
      });
      socket2.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket2,
          event: "connect",
        },
      ]);

      await joinLobby(socket2, userSession1!.lobbyId!);

      await setUserReady(socket2);

      socket1.emit("start_game");

      const expectedGame = {
        id: expect.any(String),
        lobbyId: userSession1!.lobbyId!,
        players: [
          { id: user1.id, displayName: user1.displayName },
          { id: user2.id, displayName: user2.displayName },
        ],
        gameData: {},
        startedAt: expect.any(Number),
        updatedAt: expect.any(Number),
      };

      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "game_started",
          message: {
            game: expectedGame,
          },
        },
        {
          socket: socket2,
          event: "game_started",
          message: {
            game: expectedGame,
          },
        },
      ]);

      const sessionId2 = await userSessionStore.getUserActiveSession(user1.id);
      if (!sessionId2) {
        throw new Error("No session id found");
      }
      const userSession2 = await userSessionStore.getUserSession(sessionId2);

      const game = await gameModel.get(userSession2!.gameId!);
      expect(game).not.toBeNull();
      expect(game?.players.length).toBe(2);
      expect(game?.players[0].id).toBe(user1.id);
      expect(game?.players[1].id).toBe(user2.id);
    });

    it("should return a client error if not all users are ready", async () => {
      const { socket: socket1, user: user1 } = await loginAndCreateSocket(app);
      socket1.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "connect",
        },
      ]);

      await createLobby(socket1, "Test Lobby");

      const { socket: socket2 } = await loginAndCreateSocket(app, {
        username: "testuser2",
        displayName: "Test User 2",
      });
      socket2.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket2,
          event: "connect",
        },
      ]);

      const sessionId1 = await userSessionStore.getUserActiveSession(user1.id);
      if (!sessionId1) {
        throw new Error("No session id found");
      }
      const userSession1 = await userSessionStore.getUserSession(sessionId1);
      expect(userSession1).not.toBeNull();
      expect(userSession1?.lobbyId).not.toBe("none");

      await joinLobby(socket2, userSession1!.lobbyId!);

      socket1.emit("start_game");

      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "client_error",
        },
      ]);
    });

    it("should return a client error if the lobby has less than 2 users", async () => {
      const { socket: socket1 } = await loginAndCreateSocket(app);
      socket1.connect();
      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "connect",
        },
      ]);

      await createLobby(socket1, "Test Lobby");

      socket1.emit("start_game");

      await waitForMultipleSocketsAndEvents([
        {
          socket: socket1,
          event: "client_error",
        },
      ]);
    });
  });
});
