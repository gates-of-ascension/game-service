import { expect } from "@jest/globals";
import { loginAndCreateSocket } from "../../../util/authHelper";
import {
  waitForMultipleSocketsAndEvents,
  createLobby,
  joinLobby,
  expectLobbyState,
  setUserReady,
} from "../../../util/websocketUtils";
import setupTestEnvironment from "../../../util/testSetup";
import { UserSessionStore } from "../../../../src/models/redis/UserSessionStore";
import { LobbyModel } from "../../../../src/models/redis/LobbyModel";
import { cleanupDataStores } from "../../../util/dataStoreCleanup";
import { RedisClient } from "../../../../src/initDatastores";
import { Express } from "express";
import http from "http";

describe("User Ready Status", () => {
  let app: Express;
  let server: http.Server;
  let userSessionStore: UserSessionStore;
  let redisClient: RedisClient;
  let lobbyModel: LobbyModel;

  beforeAll(async () => {
    const {
      app: testApp,
      server: testServer,
      userSessionStore: testUserSessionStore,
      lobbyModel: testLobbyModel,
      redisClient: testRedisClient,
    } = await setupTestEnvironment();
    app = testApp;
    server = testServer;
    userSessionStore = testUserSessionStore;
    redisClient = testRedisClient;
    lobbyModel = testLobbyModel;
    server.listen(process.env.PORT!);
  });

  beforeEach(async () => {
    await cleanupDataStores(redisClient);
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
