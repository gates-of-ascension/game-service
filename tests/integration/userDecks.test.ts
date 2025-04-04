import { expect } from "@jest/globals";
import setupTestEnvironment from "../util/testSetup";
import { Express } from "express";
import request from "supertest";
import User from "../../src/models/postgres/User";
import UserDeck from "../../src/models/postgres/UserDeck";
import { v4 as uuidv4 } from "uuid";
import UserDeckCard from "../../src/models/postgres/UserDeckCard";
import Card from "../../src/models/postgres/Card";
import { createUserAndLogin } from "../util/authHelper";
import { RedisClient } from "../../src/initDatastores";

describe("User Decks", () => {
  let app: Express;
  let redisClient: RedisClient;

  beforeAll(async () => {
    const { app: testApp, redisClient: testRedisClient } =
      await setupTestEnvironment();
    app = testApp;
    redisClient = testRedisClient;
    await UserDeckCard.destroy({ where: {} });
    await UserDeck.destroy({ where: {} });
    await Card.destroy({ where: {} });
    await User.destroy({ where: {} });
    await redisClient.flushAll();
  });

  beforeEach(async () => {
    await User.destroy({ where: {} });
    await UserDeck.destroy({ where: {} });
    await UserDeckCard.destroy({ where: {} });
    await redisClient.flushAll();
  });

  describe("POST /v1/users/:userId/decks", () => {
    it("should return 401 if the user is not authenticated", async () => {
      const response = await request(app).post("/v1/users/1/decks").send({});
      expect(response.status).toBe(401);
    });

    it("should return 403 if the user is not the same as the authenticated user", async () => {
      const { agent } = await createUserAndLogin(app);
      const response = await agent.post(`/v1/users/1/decks`).send({});
      expect(response.status).toBe(403);
    });

    it("should return 400 if name is not provided", async () => {
      const { agent, user } = await createUserAndLogin(app);
      const response = await agent.post(`/v1/users/${user.id}/decks`).send({});
      expect(response.status).toBe(400);
    });

    it("should create a new user deck and update the session with the new user deck id", async () => {
      const { agent, user } = await createUserAndLogin(app);
      const response = await agent.post(`/v1/users/${user.id}/decks`).send({
        name: "My Deck",
      });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe("My Deck");
      expect(response.body.userId).toBe(user.id);
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();

      const userDeckGetResponse = await agent.get(
        `/v1/users/${user.id}/decks/${response.body.id}`,
      ); // if this fails due to 403, the session is not updated with the new user deck id
      expect(userDeckGetResponse.status).not.toBe(403);
      expect(userDeckGetResponse.status).toBe(200);
    });
  });

  describe("GET /v1/users/:userId/decks/:deckId", () => {
    it("should return 401 if the user is not authenticated", async () => {
      const response = await request(app).get(`/v1/users/1/decks/${uuidv4()}`);
      expect(response.status).toBe(401);
    });

    it("should return 403 if the user is not the same as the authenticated user", async () => {
      const { agent } = await createUserAndLogin(app);
      const response = await agent.get(`/v1/users/1/decks/${uuidv4()}`);
      expect(response.status).toBe(403);
    });

    it("should return 200 if the user deck is found", async () => {
      const { agent, user } = await createUserAndLogin(app);
      const userDeckResponse = await agent
        .post(`/v1/users/${user.id}/decks`)
        .send({
          name: "My Deck",
        }); // this also checks if the session is updated with the new user deck id
      const response = await agent.get(
        `/v1/users/${user.id}/decks/${userDeckResponse.body.id}`,
      );
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(userDeckResponse.body.id);
      expect(response.body.name).toBe(userDeckResponse.body.name);
      expect(response.body.userId).toBe(user.id);
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });
  });

  describe("GET /v1/users/:userId/decks", () => {
    it("should return 401 if the user is not authenticated", async () => {
      const response = await request(app).get(`/v1/users/1/decks`);
      expect(response.status).toBe(401);
    });

    it("should return 403 if the user is not the same as the authenticated user", async () => {
      const { agent } = await createUserAndLogin(app);
      const response = await agent.get(`/v1/users/1/decks`);
      expect(response.status).toBe(403);
    });

    it("should return 200 if the user decks are found and the user deck is returned", async () => {
      const { agent, user } = await createUserAndLogin(app);
      const [userDeckResponse, userDeck2Response] = await Promise.all([
        agent.post(`/v1/users/${user.id}/decks`).send({
          name: "My Deck",
        }),
        agent.post(`/v1/users/${user.id}/decks`).send({
          name: "My Deck 2",
        }),
      ]);
      const response = await agent.get(`/v1/users/${user.id}/decks`);
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response.body.some((deck: any) => deck.id === userDeckResponse.body.id),
      ).toBe(true);
      expect(
        response.body.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (deck: any) => deck.id === userDeck2Response.body.id,
        ),
      ).toBe(true);
    });
  });

  describe("PUT /v1/user-decks/:id", () => {
    it("should return 401 if the user is not authenticated", async () => {
      const response = await request(app)
        .put(`/v1/users/1/decks/${uuidv4()}`)
        .send({});
      expect(response.status).toBe(401);
    });

    it("should return 403 if the user is not the same as the authenticated user", async () => {
      const { agent } = await createUserAndLogin(app);
      const response = await agent.put(`/v1/users/1/decks/${uuidv4()}`);
      expect(response.status).toBe(403);
    });

    it("should return 400 if no fields are provided", async () => {
      const { agent, user } = await createUserAndLogin(app);
      const userDeckResponse = await agent
        .post(`/v1/users/${user.id}/decks`)
        .send({
          name: "My Deck",
        });
      const response = await agent
        .put(`/v1/users/${user.id}/decks/${userDeckResponse.body.id}`)
        .send({});
      expect(response.status).toBe(400);
    });

    it("should return 200 if the user deck is updated", async () => {
      const { agent, user } = await createUserAndLogin(app);
      const userDeckResponse = await agent
        .post(`/v1/users/${user.id}/decks`)
        .send({
          name: "My Deck",
        });
      const response = await agent
        .put(`/v1/users/${user.id}/decks/${userDeckResponse.body.id}`)
        .send({
          name: "My Updated Deck",
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(userDeckResponse.body.id);
      expect(response.body.name).toBe("My Updated Deck");
      expect(response.body.userId).toBe(user.id);
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });
  });

  describe("DELETE /v1/users/:userId/decks/:deckId", () => {
    it("should return 401 if the user is not authenticated", async () => {
      const response = await request(app).delete(
        `/v1/users/1/decks/${uuidv4()}`,
      );
      expect(response.status).toBe(401);
    });

    it("should return 403 if the user is not the same as the authenticated user", async () => {
      const { agent } = await createUserAndLogin(app);
      const response = await agent.delete(`/v1/users/1/decks/${uuidv4()}`);
      expect(response.status).toBe(403);
    });

    it("should return 200 if the user deck is deleted, and all user deck cards are deleted", async () => {
      const { agent, user } = await createUserAndLogin(app);
      const userDeckResponse = await agent
        .post(`/v1/users/${user.id}/decks`)
        .send({
          name: "My Deck",
        });

      const card1 = await Card.create({
        name: "My Card 1",
        type: "My Type 1",
      });
      const card2 = await Card.create({
        name: "My Card 2",
        type: "My Type 2",
      });
      await UserDeckCard.create({
        userDeckId: userDeckResponse.body.id,
        cardId: card1.id,
      });
      await UserDeckCard.create({
        userDeckId: userDeckResponse.body.id,
        cardId: card2.id,
      });

      const response = await agent.delete(
        `/v1/users/${user.id}/decks/${userDeckResponse.body.id}`,
      );
      expect(response.status).toBe(200);
      expect(
        await UserDeckCard.findAll({
          where: { userDeckId: userDeckResponse.body.id },
        }),
      ).toEqual([]);
    });
  });
});
