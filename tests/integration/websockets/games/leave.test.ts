import { expect } from "@jest/globals";
import { loginAndCreateSocket } from "../../../util/authHelper";
import {
  waitForMultipleSocketsAndEvents,
  createLobby,
  joinLobby,
  setUserReady,
  waitForSocketEvent,
} from "../../../util/websocketUtils";
import setupTestEnvironment from "../../../util/testSetup";
import { UserSessionStore } from "../../../../src/models/redis/UserSessionStore";
import { LobbyModel } from "../../../../src/models/redis/LobbyModel";
import { GameModel } from "../../../../src/models/redis/GameModel";
import { cleanupDataStores } from "../../../util/dataStoreCleanup";
import { RedisClient } from "../../../../src/initDatastores";
import { Express } from "express";
import http from "http";

describe("Game Leaving", () => {
  let app: Express;
  let server: http.Server;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let lobbyModel: LobbyModel;
  let gameModel: GameModel;
  let userSessionStore: UserSessionStore;
  let redisClient: RedisClient;

  beforeAll(async () => {
    const {
      app: testApp,
      server: testServer,
      userSessionStore: testUserSessionStore,
      lobbyModel: testLobbyModel,
      gameModel: testGameModel,
      redisClient: testRedisClient,
    } = await setupTestEnvironment();
    app = testApp;
    server = testServer;
    lobbyModel = testLobbyModel;
    gameModel = testGameModel;
    userSessionStore = testUserSessionStore;
    redisClient = testRedisClient;
    server.listen(process.env.PORT!);
  });

  beforeEach(async () => {
    await cleanupDataStores(redisClient);
  });

  it("should return a client error if the user is not in a game", async () => {
    const { socket } = await loginAndCreateSocket(app);
    socket.connect();
    await waitForMultipleSocketsAndEvents([
      {
        socket,
        event: "connect",
      },
    ]);

    socket.emit("leave_current_game");

    await waitForMultipleSocketsAndEvents([
      {
        socket,
        event: "client_error",
        message: "Cannot remove user from game, user is not in a game",
      },
    ]);
  });

  it("should remove the player from the game in redis and update the game for the remaining player", async () => {
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
    const sessionId1 = await userSessionStore.getUserActiveSession(user1.id);
    if (!sessionId1) {
      throw new Error("No session id found");
    }
    const userSession1 = await userSessionStore.getUserSession(sessionId1);
    await joinLobby(socket2, userSession1!.lobbyId!);

    await setUserReady(socket2);

    socket1.emit("start_game");
    await waitForMultipleSocketsAndEvents([
      {
        socket: socket1,
        event: "user_session_updated",
      },
      {
        socket: socket2,
        event: "user_session_updated",
      },
    ]);
    const userSessionForGame =
      await userSessionStore.getUserSession(sessionId1);
    const gameId = userSessionForGame!.gameId!;

    socket2.emit("leave_current_game");

    const socketEvents = await Promise.all([
      waitForSocketEvent(socket1, "user_session_updated"),
      waitForSocketEvent(socket2, "user_session_updated"),
    ]);

    expect(socketEvents[0].data).toEqual({
      session: {
        game: {
          id: expect.any(String),
          lobbyId: expect.any(String),
          gameData: expect.any(Object),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          players: [
            {
              id: user1.id,
              joinedAt: expect.any(String),
              displayName: user1.displayName,
            },
          ],
        },
      },
      event_name: "user_left",
    });

    expect(socketEvents[1].data).toEqual({
      session: {
        game: {},
      },
      event_name: "user_session_game_removed",
    });

    const updatedSession1 = await userSessionStore.getUserSession(sessionId1);
    expect(updatedSession1).not.toBeNull();
    expect(updatedSession1?.gameId).toBe(gameId);

    const game = await gameModel.get(userSession1!.gameId!);
    expect(game).toBeNull();

    const sessionId2 = await userSessionStore.getUserActiveSession(user2.id);
    if (!sessionId2) {
      throw new Error("No session id found");
    }
    const userSession2 = await userSessionStore.getUserSession(sessionId2);
    expect(userSession2).not.toBeNull();
    expect(userSession2?.gameId).toBe("none");
  });
});
