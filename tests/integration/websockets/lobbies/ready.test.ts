import { expect } from "@jest/globals";
import { loginAndCreateSocket } from "../../../util/authHelper";
import {
  waitForMultipleSocketsAndEvents,
  createLobby,
  joinLobby,
  waitForSocketEvent,
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
        message: "Cannot set user ready while not in a lobby",
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

    const userSessionId = await userSessionStore.getUserActiveSession(user.id);
    if (!userSessionId) {
      throw new Error("No user session id found");
    }
    const userSession = await userSessionStore.getUserSession(userSessionId);
    expect(userSession).not.toBeNull();
    expect(userSession?.lobbyId).not.toBe("none");
    const lobbyId = userSession?.lobbyId;
    const lobby = await lobbyModel.get(lobbyId!);
    expect(lobby).not.toBeNull();
    expect(lobby?.owner.id).toBe(user.id);
    expect(lobby?.owner.isReady).toBe(false);

    socket.emit("set_user_ready", { isReady: true });
    const readyEvent1 = await waitForSocketEvent(
      socket,
      "user_session_updated",
    );
    expect(readyEvent1.data).toEqual({
      session: {
        lobby: {
          id: lobbyId!,
          name: "Test Lobby",
          owner: {
            id: user.id,
            displayName: user.displayName,
            isReady: true,
            joinedAt: expect.any(String),
          },
          users: [],
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      },
      event_name: "user_ready",
    });

    const lobby2 = await lobbyModel.get(lobbyId!);
    expect(lobby2).not.toBeNull();
    expect(lobby2?.owner.isReady).toBe(true);

    socket.emit("set_user_ready", { isReady: false });
    const readyEvent2 = await waitForSocketEvent(
      socket,
      "user_session_updated",
    );
    expect(readyEvent2.data).toEqual({
      session: {
        lobby: {
          id: lobbyId!,
          name: "Test Lobby",
          owner: {
            id: user.id,
            displayName: user.displayName,
            isReady: false,
            joinedAt: expect.any(String),
          },
          users: [],
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      },
      event_name: "user_ready",
    });

    const lobby3 = await lobbyModel.get(lobbyId!);
    expect(lobby3).not.toBeNull();
    expect(lobby3?.owner.isReady).toBe(false);
  });

  it("should set a joined user as ready in redis and emit the event to the lobby", async () => {
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

    socket2.emit("set_user_ready", { isReady: true });

    const socketEvents = await Promise.all([
      waitForSocketEvent(socket2, "user_session_updated"),
      waitForSocketEvent(socket, "user_session_updated"),
    ]);
    const expectedLobby = {
      id: userSession2!.lobbyId!,
      name: "Test Lobby",
      owner: {
        id: user.id,
        displayName: user.displayName,
        isReady: false,
        joinedAt: expect.any(String),
      },
      users: [
        {
          id: user2.id,
          displayName: user2.displayName,
          isReady: true,
          joinedAt: expect.any(String),
        },
      ],
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    };

    expect(socketEvents[0].data).toEqual({
      session: {
        lobby: expectedLobby,
      },
      event_name: "user_ready",
    });

    expect(socketEvents[1].data).toEqual({
      session: {
        lobby: expectedLobby,
      },
      event_name: "user_ready",
    });

    const lobby = await lobbyModel.get(userSession2!.lobbyId!);
    expect(lobby).not.toBeNull();
    expect(lobby?.owner.isReady).toBe(false);
    expect(lobby?.users[0].isReady).toBe(true);
  });
});
