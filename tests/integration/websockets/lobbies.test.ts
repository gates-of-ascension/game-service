import { expect } from "@jest/globals";
import setupTestEnvironment from "../../util/testSetup";
import { Express } from "express";
import request from "supertest";
import { createUserAndLogin } from "../../util/authHelper";
import { RedisClient } from "../../../src/initDatastores";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { Server, type Socket as ServerSocket } from "socket.io";
import UserDeckCard from "../../../src/models/postgres/UserDeckCard";
import UserDeck from "../../../src/models/postgres/UserDeck";
import Card from "../../../src/models/postgres/Card";
import User from "../../../src/models/postgres/User";

function waitFor(socket: ServerSocket | ClientSocket, event: string) {
  return new Promise((resolve) => {
    socket.once(event, resolve);
  });
}

describe("Lobbies", () => {
  let app: Express;
  let redisClient: RedisClient;
  let server: any;

  beforeAll(async () => {
    const {
      app: testApp,
      redisClient: testRedisClient,
      server: testServer,
    } = await setupTestEnvironment();
    app = testApp;
    redisClient = testRedisClient;
    server = testServer;
    await UserDeckCard.destroy({ where: {} });
    await UserDeck.destroy({ where: {} });
    await Card.destroy({ where: {} });
    await User.destroy({ where: {} });
    await redisClient.flushAll();
    server.listen(process.env.PORT!);
  });

  beforeEach(async () => {
    await redisClient.flushAll();
  });

  it("should create a lobby", async () => {
    const { agent, cookies } = await createUserAndLogin(app);
    const socketOptions = {
      transportOptions: {
        polling: {
          extraHeaders: {
            Cookie: cookies[0],
          },
        },
      },
    };
    const socket = ioc(`http://localhost:${process.env.PORT!}`, socketOptions);
    socket.emit("create_lobby", {
      name: "Test Lobby",
    });
    return await waitFor(socket, "lobby_created");
  });
});
