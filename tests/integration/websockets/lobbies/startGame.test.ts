import { expect } from "@jest/globals";
import { loginAndCreateSocket } from "../../../util/authHelper";
import {
  waitForMultipleSocketsAndEvents,
  createLobby,
  joinLobby,
  setUserReady,
} from "../../../util/websocketUtils";
import setupTestEnvironment from "../../../util/testSetup";
import { UserSessionStore } from "../../../../src/models/redis/UserSessionStore";
import { LobbyModel } from "../../../../src/models/redis/LobbyModel";
import { GameModel } from "../../../../src/models/redis/GameModel";
import { cleanupDataStores } from "../../../util/dataStoreCleanup";
import { RedisClient } from "../../../../src/initDatastores";
import { Express } from "express";
import http from "http";

describe("Game Start", () => {
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
