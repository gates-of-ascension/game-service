import { expect } from "@jest/globals";
import { loginAndCreateSocket } from "../../../util/authHelper";
import {
  waitForMultipleSocketsAndEvents,
  createLobby,
  joinLobby,
  expectLobbyState,
} from "../../../util/websocketUtils";
import { UserSessionStore } from "../../../../src/models/redis/UserSessionStore";
import setupTestEnvironment from "../../../util/testSetup";
import { LobbyModel } from "../../../../src/models/redis/LobbyModel";
import { cleanupDataStores } from "../../../util/dataStoreCleanup";
import { RedisClient } from "../../../../src/initDatastores";
import { Express } from "express";
import http from "http";

describe("Lobby Joining", () => {
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
});
