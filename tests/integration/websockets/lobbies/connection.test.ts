import { expect } from "@jest/globals";
import { io as ioc } from "socket.io-client";
import { loginAndCreateSocket } from "../../../util/authHelper";
import { waitForMultipleSocketsAndEvents } from "../../../util/websocketUtils";
import { UserSessionStore } from "../../../../src/models/redis/UserSessionStore";
import setupTestEnvironment from "../../../util/testSetup";
import { cleanupDataStores } from "../../../util/dataStoreCleanup";
import { Express } from "express";
import http from "http";
import { RedisClient } from "../../../../src/initDatastores";

describe("Lobby Connection", () => {
  let app: Express;
  let server: http.Server;
  let userSessionStore: UserSessionStore;
  let redisClient: RedisClient;
  beforeAll(async () => {
    const {
      app: testApp,
      server: testServer,
      userSessionStore: testUserSessionStore,
      redisClient: testRedisClient,
    } = await setupTestEnvironment();
    app = testApp;
    server = testServer;
    userSessionStore = testUserSessionStore;
    redisClient = testRedisClient;
    server.listen(process.env.PORT!);
  });

  beforeEach(async () => {
    await cleanupDataStores(redisClient);
  });

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
    const socket = ioc(`http://localhost:${process.env.PORT!}`, socketOptions);
    socket.connect();
    socket.emit("create_lobby", {
      name: "Test Lobby",
    });

    await waitForMultipleSocketsAndEvents([
      {
        socket,
        event: "connect_error",
        message: new Error("User not authenticated"),
      },
    ]);

    expect(socket.connected).toBe(false);
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

    const sessionSocketId = await userSessionStore.getUserActiveSocket(user.id);
    expect(sessionSocketId).toBe(socket.id);
  });
});
