import { expect } from "@jest/globals";
import setupTestEnvironment from "../util/testSetup";
import { Express } from "express";
import request from "supertest";
import UserDeck from "../../src/models/postgres/UserDeck";
import Card from "../../src/models/postgres/Card";
import UserDeckCard from "../../src/models/postgres/UserDeckCard";
import { v4 as uuidv4 } from "uuid";
import User from "../../src/models/postgres/User";

describe("User Deck Cards", () => {
  let app: Express;

  beforeAll(async () => {
    const { app: testApp } = await setupTestEnvironment();
    app = testApp;
    await UserDeckCard.destroy({ where: {} });
    await UserDeck.destroy({ where: {} });
    await Card.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  beforeEach(async () => {
    await UserDeckCard.destroy({ where: {} });
    await UserDeck.destroy({ where: {} });
    await Card.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  describe("GET /v1/user_decks/:id/cards", () => {
    it("should return 404 if the user deck id is not found", async () => {
      const response = await request(app).get(
        `/v1/user_decks/${uuidv4()}/cards`,
      );
      expect(response.status).toBe(404);
    });

    it("should return 400 if the user deck id is not a valid uuid", async () => {
      const response = await request(app).get(
        `/v1/user_decks/invalid-uuid/cards`,
      );
      expect(response.status).toBe(400);
    });

    it("should return 200 if the user deck cards are returned", async () => {
      const user = await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });
      const userDeck = await UserDeck.create({
        name: "My Deck",
        userId: user.id,
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
        userDeckId: userDeck.id,
        cardId: card1.id,
        quantity: 1,
      });
      await UserDeckCard.create({
        userDeckId: userDeck.id,
        cardId: card2.id,
        quantity: 1,
      });
      const response = await request(app).get(
        `/v1/user_decks/${userDeck.id}/cards`,
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

  describe("PUT /v1/user_decks/:id/cards", () => {
    it("should return 404 if the user deck id is not found", async () => {
      const response = await request(app)
        .put(`/v1/user_decks/${uuidv4()}/cards`)
        .send({
          cards: [
            {
              cardId: 1,
              quantity: 1,
            },
          ],
        });
      expect(response.status).toBe(404);
    });

    it("should return 400 if the user deck id is not a valid uuid", async () => {
      const response = await request(app)
        .put(`/v1/user_decks/invalid-uuid/cards`)
        .send({
          cards: [
            {
              cardId: 1,
              quantity: 1,
            },
          ],
        });
      expect(response.status).toBe(400);
    });

    it("should return 400 if the card id is not a valid number", async () => {
      const response = await request(app)
        .put(`/v1/user_decks/${uuidv4()}/cards`)
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
      const response = await request(app)
        .put(`/v1/user_decks/${uuidv4()}/cards`)
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
      const user = await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });
      const userDeck = await UserDeck.create({
        name: "My Deck",
        userId: user.id,
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
        userDeckId: userDeck.id,
        cardId: card1.id,
        quantity: 1,
      });
      await UserDeckCard.create({
        userDeckId: userDeck.id,
        cardId: card2.id,
        quantity: 1,
      });
      const response = await request(app)
        .put(`/v1/user_decks/${userDeck.id}/cards`)
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
