import { expect } from "@jest/globals";
import setupTestEnvironment from "../util/testSetup";
import { Express } from "express";
import request from "supertest";
import User from "../../src/models/postgres/User";
import UserDeck from "../../src/models/postgres/UserDeck";
import { v4 as uuidv4 } from "uuid";
import UserDeckCard from "../../src/models/postgres/UserDeckCard";
import Card from "../../src/models/postgres/Card";

describe("User Decks", () => {
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
    await User.destroy({ where: {} });
    await UserDeck.destroy({ where: {} });
  });

  describe("POST /v1/user-decks", () => {
    it("should return 400 if name is not provided", async () => {
      const response = await request(app).post("/v1/user_decks").send({
        name: "My Deck",
      });
      expect(response.status).toBe(400);
    });

    it("should return 404 if the user id is not found", async () => {
      const response = await request(app).post("/v1/user_decks").send({
        name: "My Deck",
        userId: uuidv4(),
      });
      expect(response.status).toBe(404);
    });

    it("should return 400 if the user id is not provided", async () => {
      const response = await request(app).post("/v1/user_decks").send({
        name: "My Deck",
      });
      expect(response.status).toBe(400);
    });

    it("should return 400 if the user id is not a valid uuid", async () => {
      const response = await request(app).post("/v1/user_decks").send({
        name: "My Deck",
        userId: "invalid-uuid",
      });
      expect(response.status).toBe(400);
    });

    it("should create a new user deck", async () => {
      const user = await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });

      const response = await request(app).post("/v1/user_decks").send({
        name: "My Deck",
        userId: user.id,
      });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe("My Deck");
      expect(response.body.userId).toBe(user.id);
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });
  });

  describe("GET /v1/user-decks/:id", () => {
    it("should return 404 if the user deck id is not found", async () => {
      const response = await request(app).get(`/v1/user_decks/${uuidv4()}`);
      expect(response.status).toBe(404);
    });

    it("should return 400 if the user deck id is not a valid uuid", async () => {
      const response = await request(app).get("/v1/user_decks/invalid-uuid");
      expect(response.status).toBe(400);
    });

    it("should return 200 if the user deck is found", async () => {
      const user = await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });

      const userDeck = await UserDeck.create({
        name: "My Deck",
        userId: user.id,
      });

      const response = await request(app).get(`/v1/user_decks/${userDeck.id}`);
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(userDeck.id);
      expect(response.body.name).toBe(userDeck.name);
      expect(response.body.userId).toBe(user.id);
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });
  });

  describe("PUT /v1/user-decks/:id", () => {
    it("should return 404 if the user deck id is not found", async () => {
      const response = await request(app)
        .put(`/v1/user_decks/${uuidv4()}`)
        .send({
          name: "My Updated Deck",
        });
      expect(response.status).toBe(404);
    });

    it("should return 400 no fields are provided", async () => {
      const response = await request(app)
        .put(`/v1/user_decks/${uuidv4()}`)
        .send({});
      expect(response.status).toBe(400);
    });

    it("should return 400 if the user deck id is not a valid uuid", async () => {
      const response = await request(app)
        .put("/v1/user_decks/invalid-uuid")
        .send({
          name: "My Updated Deck",
        });
      expect(response.status).toBe(400);
    });

    it("should return 200 if the user deck is updated", async () => {
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
        .put(`/v1/user_decks/${userDeck.id}`)
        .send({
          name: "My Updated Deck",
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(userDeck.id);
      expect(response.body.name).toBe("My Updated Deck");
      expect(response.body.userId).toBe(user.id);
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });
  });

  describe("DELETE /v1/user-decks/:id", () => {
    it("should return 404 if the user deck id is not found", async () => {
      const response = await request(app).delete(`/v1/user_decks/${uuidv4()}`);
      expect(response.status).toBe(404);
    });

    it("should return 400 if the user deck id is not a valid uuid", async () => {
      const response = await request(app).delete("/v1/user_decks/invalid-uuid");
      expect(response.status).toBe(400);
    });

    it("should return 200 if the user deck is deleted, and all user deck cards are deleted", async () => {
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
        name: "My Card 1",
        type: "My Type 1",
      });
      const card2 = await Card.create({
        name: "My Card 2",
        type: "My Type 2",
      });
      await UserDeckCard.create({
        userDeckId: userDeck.id,
        cardId: card1.id,
      });
      await UserDeckCard.create({
        userDeckId: userDeck.id,
        cardId: card2.id,
      });

      const response = await request(app).delete(
        `/v1/user_decks/${userDeck.id}`,
      );
      expect(response.status).toBe(200);
      expect(
        await UserDeckCard.findAll({ where: { userDeckId: userDeck.id } }),
      ).toEqual([]);
    });
  });
});
