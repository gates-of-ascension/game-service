import { expect } from "@jest/globals";
import setupTestEnvironment from "../../util/testSetup";
import { Express } from "express";
import request from "supertest";
import Card from "../../../src/models/postgres/Card";
import UserDeckCard from "../../../src/models/postgres/UserDeckCard";
import { v4 as uuidv4 } from "uuid";
import { createUserAndLogin } from "../../util/authHelper";
import { RedisClient } from "../../../src/initDatastores";
import { cleanupDataStores } from "../../util/dataStoreCleanup";

describe("User Deck Cards", () => {
  let app: Express;
  let redisClient: RedisClient;

  beforeAll(async () => {
    const { app: testApp, redisClient: testRedisClient } =
      await setupTestEnvironment();
    app = testApp;
    redisClient = testRedisClient;
    await cleanupDataStores(redisClient);
  });

  beforeEach(async () => {
    await cleanupDataStores(redisClient);
  });

  describe("GET /v1/users/:userId/decks/:deckId/cards", () => {
    it("should return 401 if the user is not authenticated", async () => {
      const response = await request(app).get(
        `/v1/users/1/decks/${uuidv4()}/cards`,
      );
      expect(response.status).toBe(401);
    });

    it("should return 403 if the user is not the same as the authenticated user", async () => {
      const { agent } = await createUserAndLogin(app);
      const response = await agent.get(`/v1/users/1/decks/${uuidv4()}/cards`);
      expect(response.status).toBe(403);
    });

    it("should return 200 if the user deck cards are returned", async () => {
      const { agent, user } = await createUserAndLogin(app);
      const userDeckResponse = await agent
        .post(`/v1/users/${user.id}/decks`)
        .send({
          name: "My Deck",
        });
      const card1 = await Card.create({
        name: "My Card",
        type: "My Type",
      });
      const card2 = await Card.create({
        name: "My Card 2",
        type: "My Type 2",
      });
      await UserDeckCard.create({
        userDeckId: userDeckResponse.body.id,
        cardId: card1.id,
        quantity: 1,
      });
      await UserDeckCard.create({
        userDeckId: userDeckResponse.body.id,
        cardId: card2.id,
        quantity: 1,
      });
      const response = await agent.get(
        `/v1/users/${user.id}/decks/${userDeckResponse.body.id}/cards`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          cardId: card1.id,
          quantity: 1,
        },
        {
          cardId: card2.id,
          quantity: 1,
        },
      ]);
    });
  });

  describe("PUT /v1/users/:userId/decks/:deckId/cards", () => {
    it("should return 401 if the user is not authenticated", async () => {
      const response = await request(app)
        .put(`/v1/users/1/decks/${uuidv4()}/cards`)
        .send({
          cards: [],
        });
      expect(response.status).toBe(401);
    });

    it("should return 403 if the user is not the same as the authenticated user", async () => {
      const { agent } = await createUserAndLogin(app);
      const response = await agent.put(`/v1/users/1/decks/${uuidv4()}/cards`);
      expect(response.status).toBe(403);
    });

    it("should return 400 if the card id is not a valid number", async () => {
      const { agent, user } = await createUserAndLogin(app);
      const userDeckResponse = await agent
        .post(`/v1/users/${user.id}/decks`)
        .send({
          name: "My Deck",
        });
      const response = await agent
        .put(`/v1/users/${user.id}/decks/${userDeckResponse.body.id}/cards`)
        .send({
          cards: [
            {
              cardId: "not a number",
              quantity: 1,
            },
          ],
        });
      expect(response.status).toBe(400);
    });

    it("should return 400 if the cards array is empty", async () => {
      const { agent, user } = await createUserAndLogin(app);
      const userDeckResponse = await agent
        .post(`/v1/users/${user.id}/decks`)
        .send({
          name: "My Deck",
        });
      const response = await agent
        .put(`/v1/users/${user.id}/decks/${userDeckResponse.body.id}/cards`)
        .send({ cards: [] });
      expect(response.status).toBe(400);
    });

    it("should create new user deck cards, update existing user deck cards, and delete non-passed user deck cards", async () => {
      /*
      Current User Deck Cards is just card1 with a quantity of 1, and card2 with a quantity of 1,
      we are passing in card2 and card3 without card1, so:
      - card1 should be deleted
      - card2 should be updated with a quantity of 2
      - card3 should be created with a quantity of 3
      */
      const { agent, user } = await createUserAndLogin(app);
      const userDeckResponse = await agent
        .post(`/v1/users/${user.id}/decks`)
        .send({
          name: "My Deck",
        });
      const card1 = await Card.create({
        name: "My Card",
        type: "My Type",
      });
      const card2 = await Card.create({
        name: "My Card 2",
        type: "My Type 2",
      });
      const card3 = await Card.create({
        name: "My Card 3",
        type: "My Type 3",
      });
      await UserDeckCard.create({
        userDeckId: userDeckResponse.body.id,
        cardId: card1.id,
        quantity: 1,
      });
      await UserDeckCard.create({
        userDeckId: userDeckResponse.body.id,
        cardId: card2.id,
        quantity: 1,
      });
      const response = await agent
        .put(`/v1/users/${user.id}/decks/${userDeckResponse.body.id}/cards`)
        .send({
          cards: [
            {
              cardId: card2.id,
              quantity: 2,
            },
            {
              cardId: card3.id,
              quantity: 3,
            },
          ],
        });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        cards: [
          {
            cardId: card2.id,
            quantity: 2,
          },
          {
            cardId: card3.id,
            quantity: 3,
          },
        ],
      });
    });
  });
});
