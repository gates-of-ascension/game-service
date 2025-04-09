import { expect } from "@jest/globals";
import { loginAndCreateSocket } from "../../../util/authHelper";
import {
  waitForMultipleSocketsAndEvents,
  createLobby,
  joinLobby,
} from "../../../util/websocketUtils";
import setupTestEnvironment from "../../../util/testSetup";
import { UserSessionStore } from "../../../../src/models/redis/UserSessionStore";
import { LobbyModel } from "../../../../src/models/redis/LobbyModel";
import { cleanupDataStores } from "../../../util/dataStoreCleanup";
import { RedisClient } from "../../../../src/initDatastores";
import { Express } from "express";
import http from "http";

describe("Lobby Leaving", () => {
  let app: Express;
  let server: http.Server;
  let lobbyModel: LobbyModel;
  let userSessionStore: UserSessionStore;
  let redisClient: RedisClient;

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
    lobbyModel = testLobbyModel;
    userSessionStore = testUserSessionStore;
    redisClient = testRedisClient;
    server.listen(process.env.PORT!);
  });

  beforeEach(async () => {
    await cleanupDataStores(redisClient);
  });

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
