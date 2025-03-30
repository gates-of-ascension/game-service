import { expect } from "@jest/globals";
import setupTestEnvironment from "../util/testSetup";
import { Express } from "express";
import request from "supertest";
import Card from "../../src/models/Card";
import UserDeckCard from "../../src/models/UserDeckCard";
import UserDeck from "../../src/models/UserDeck";
import User from "../../src/models/User";

describe("Cards", () => {
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
    await Card.destroy({ where: {} });
  });

  describe("POST /v1/cards", () => {
    it("should return 400 if name is not provided", async () => {
      const response = await request(app).post("/v1/cards").send({
        name: "Card 1",
      });
      expect(response.status).toBe(400);
    });

    it("should return 400 if type is not provided", async () => {
      const response = await request(app).post("/v1/cards").send({
        name: "Card 1",
      });
      expect(response.status).toBe(400);
    });

    it("should create a card", async () => {
      const response = await request(app).post("/v1/cards").send({
        name: "Card 1",
        type: "Card",
      });
      expect(response.status).toBe(201);

      const card = await Card.findOne({
        where: {
          name: "Card 1",
        },
      });

      expect(card).not.toBeNull();
      expect(card?.name).toBe("Card 1");
      expect(card?.type).toBe("Card");
    });
  });

  describe("GET /v1/cards/:id", () => {
    it("should return 404 if card does not exist", async () => {
      const response = await request(app).get("/v1/cards/1");
      expect(response.status).toBe(404);
    });

    it("should return 400 if id is not a valid number", async () => {
      const response = await request(app).get("/v1/cards/invalid-id");
      expect(response.status).toBe(400);
    });

    it("should return a card", async () => {
      const card = await Card.create({
        name: "Card 1",
        type: "Card",
      });
      const response = await request(app).get(`/v1/cards/${card.id}`);
      expect(response.status).toBe(200);

      const cardResponse = await Card.findOne({
        where: {
          id: card.id,
        },
      });

      expect(cardResponse).not.toBeNull();
      expect(cardResponse?.name).toBe("Card 1");
      expect(cardResponse?.type).toBe("Card");
    });
  });

  describe("PUT /v1/cards/:id", () => {
    it("should return 404 if card does not exist", async () => {
      const response = await request(app).put(`/v1/cards/1`).send({
        name: "Card 2",
        type: "Card",
      });
      expect(response.status).toBe(404);
    });

    it("should return 400 if no fields are provided", async () => {
      const response = await request(app).put(`/v1/cards/1`);
      expect(response.status).toBe(400);
    });

    it("should return 400 if id is not a valid number", async () => {
      const response = await request(app).put("/v1/cards/invalid-id").send({
        name: "Card 2",
        type: "Card",
      });
      expect(response.status).toBe(400);
    });

    it("should update a card", async () => {
      const card = await Card.create({
        name: "Card 1",
        type: "Card",
      });
      const response = await request(app).put(`/v1/cards/${card.id}`).send({
        name: "Card 2",
        type: "Card",
      });
      expect(response.status).toBe(200);

      const cardResponse = await Card.findOne({
        where: {
          id: card.id,
        },
      });

      expect(cardResponse).not.toBeNull();
      expect(cardResponse?.name).toBe("Card 2");
      expect(cardResponse?.type).toBe("Card");
    });
  });

  describe("DELETE /v1/cards/:id", () => {
    it("should return 404 if card does not exist", async () => {
      const response = await request(app).delete(`/v1/cards/1`);
      expect(response.status).toBe(404);
    });

    it("should return 400 if id is not a valid number", async () => {
      const response = await request(app).delete("/v1/cards/invalid-id");
      expect(response.status).toBe(400);
    });

    it("should delete a card", async () => {
      const card = await Card.create({
        name: "Card 1",
        type: "Card",
      });
      const response = await request(app).delete(`/v1/cards/${card.id}`);
      expect(response.status).toBe(200);

      const cardResponse = await Card.findOne({
        where: {
          id: card.id,
        },
      });

      expect(cardResponse).toBeNull();
    });
  });
});
