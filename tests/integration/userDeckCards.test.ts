import { expect } from "@jest/globals";
import setupTestEnvironment from "../util/testSetup";
import { Express } from "express";
import request from "supertest";
import UserDeck from "../../src/models/UserDeck";
import Card from "../../src/models/Card";
import UserDeckCard from "../../src/models/UserDeckCard";
import { v4 as uuidv4 } from "uuid";
import User from "../../src/models/User";

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

  describe("POST /v1/user_decks/:id/cards", () => {
    it("should return 400 if no fields are provided", async () => {
      const response = await request(app).post(
        `/v1/user_decks/${uuidv4()}/cards`,
      );
      expect(response.status).toBe(400);
    });

    it("should return 404 if the user deck id is not found", async () => {
      const card = await Card.create({
        name: "My Card",
        type: "My Type",
      });
      const response = await request(app)
        .post(`/v1/user_decks/${uuidv4()}/cards`)
        .send({
          cardId: card.id,
          quantity: 1,
        });
      expect(response.status).toBe(404);
    });

    it("should return 400 if the user deck id is not a valid uuid", async () => {
      const response = await request(app)
        .post(`/v1/user_decks/invalid-uuid/cards`)
        .send({
          cardId: 1,
          quantity: 1,
        });
      expect(response.status).toBe(400);
    });

    it("should return 400 if the card id is not provided", async () => {
      const response = await request(app)
        .post(`/v1/user_decks/${uuidv4()}/cards`)
        .send({
          quantity: 1,
        });
      expect(response.status).toBe(400);
    });

    it("should return 400 if the card id is not a valid number", async () => {
      const response = await request(app)
        .post(`/v1/user_decks/${uuidv4()}/cards`)
        .send({
          cardId: "not a number",
          quantity: 1,
        });
      expect(response.status).toBe(400);
    });

    it("should return 404 if the card id is not found", async () => {
      const user = await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });
      const userDeck = await UserDeck.create({
        name: "My Deck",
        userId: user.id,
      });
      const response = await request(app)
        .post(`/v1/user_decks/${userDeck.id}/cards`)
        .send({
          cardId: 1,
          quantity: 1,
        });
      expect(response.status).toBe(404);
    });

    it("should return 400 if the quantity is not provided", async () => {
      const response = await request(app)
        .post(`/v1/user_decks/${uuidv4()}/cards`)
        .send({
          cardId: 1,
        });
      expect(response.status).toBe(400);
    });

    it("should return 400 if the quantity is not a number", async () => {
      const response = await request(app)
        .post(`/v1/user_decks/${uuidv4()}/cards`)
        .send({
          cardId: 1,
          quantity: "not a number",
        });
      expect(response.status).toBe(400);
    });

    it("should return 201 if a new user deck card is created", async () => {
      const user = await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });

      const userDeck = await UserDeck.create({
        name: "My Deck",
        userId: user.id,
      });
      const card = await Card.create({
        name: "My Card",
        type: "My Type",
      });
      const response = await request(app)
        .post(`/v1/user_decks/${userDeck.id}/cards`)
        .send({
          cardId: card.id,
          quantity: 1,
        });
      expect(response.status).toBe(201);
    });
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

  describe("DELETE /v1/user_decks/:id/cards/:cardId", () => {
    it("should return 404 if the user deck id is not found", async () => {
      const card = await Card.create({
        name: "My Card",
        type: "My Type",
      });
      const response = await request(app).delete(
        `/v1/user_decks/${uuidv4()}/cards/${card.id}`,
      );
      expect(response.status).toBe(404);
    });

    it("should return 400 if the user deck id is not a valid uuid", async () => {
      const response = await request(app).delete(
        `/v1/user_decks/invalid-uuid/cards/1`,
      );
      expect(response.status).toBe(400);
    });

    it("should return 404 if the card id is not found", async () => {
      const user = await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });
      const userDeck = await UserDeck.create({
        name: "My Deck",
        userId: user.id,
      });
      const response = await request(app).delete(
        `/v1/user_decks/${userDeck.id}/cards/1`,
      );
      expect(response.status).toBe(404);
    });

    it("should return 400 if the card id is not a valid number", async () => {
      const response = await request(app).delete(
        `/v1/user_decks/${uuidv4()}/cards/invalid-number`,
      );
      expect(response.status).toBe(400);
    });

    it("should return 200 if the user deck card is deleted", async () => {
      const user = await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });
      const userDeck = await UserDeck.create({
        name: "My Deck",
        userId: user.id,
      });
      const card = await Card.create({
        name: "My Card",
        type: "My Type",
      });

      await UserDeckCard.create({
        userDeckId: userDeck.id,
        cardId: card.id,
        quantity: 1,
      });
      const response = await request(app).delete(
        `/v1/user_decks/${userDeck.id}/cards/${card.id}`,
      );
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /v1/user_decks/:id/cards/:cardId", () => {
    it("should return 404 if the user deck id is not found", async () => {
      const card = await Card.create({
        name: "My Card",
        type: "My Type",
      });
      const response = await request(app)
        .put(`/v1/user_decks/${uuidv4()}/cards/${card.id}`)
        .send({
          quantity: 1,
        });
      expect(response.status).toBe(404);
    });

    it("should return 400 if the user deck id is not a valid uuid", async () => {
      const response = await request(app)
        .put(`/v1/user_decks/invalid-uuid/cards/1`)
        .send({
          quantity: 1,
        });
      expect(response.status).toBe(400);
    });

    it("should return 404 if the card id is not found", async () => {
      const user = await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });
      const userDeck = await UserDeck.create({
        name: "My Deck",
        userId: user.id,
      });
      const response = await request(app)
        .put(`/v1/user_decks/${userDeck.id}/cards/1`)
        .send({
          quantity: 1,
        });
      expect(response.status).toBe(404);
    });

    it("should return 400 if the card id is not a valid number", async () => {
      const response = await request(app)
        .put(`/v1/user_decks/${uuidv4()}/cards/invalid-number`)
        .send({
          quantity: 1,
        });
      expect(response.status).toBe(400);
    });

    it("should return 200 if the user deck card is updated", async () => {
      const user = await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });
      const userDeck = await UserDeck.create({
        name: "My Deck",
        userId: user.id,
      });
      const card = await Card.create({
        name: "My Card",
        type: "My Type",
      });
      await UserDeckCard.create({
        userDeckId: userDeck.id,
        cardId: card.id,
        quantity: 1,
      });
      const response = await request(app)
        .put(`/v1/user_decks/${userDeck.id}/cards/${card.id}`)
        .send({
          quantity: 2,
        });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        userDeckId: userDeck.id,
        cardId: card.id,
        quantity: 2,
      });
    });
  });
});
