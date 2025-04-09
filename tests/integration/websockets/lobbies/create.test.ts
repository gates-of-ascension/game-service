import { expect } from "@jest/globals";
import { loginAndCreateSocket } from "../../../util/authHelper";
import { UserSessionStore } from "../../../../src/models/redis/UserSessionStore";
import {
  waitForMultipleSocketsAndEvents,
  createLobby,
  expectLobbyState,
} from "../../../util/websocketUtils";
import { LobbyModel } from "../../../../src/models/redis/LobbyModel";
import { cleanupDataStores } from "../../../util/dataStoreCleanup";
import { RedisClient } from "../../../../src/initDatastores";
import { Express } from "express";
import http from "http";
import setupTestEnvironment from "../../../util/testSetup";

describe("Lobby Creation", () => {
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
