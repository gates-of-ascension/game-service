import { expect } from "@jest/globals";
import setupTestEnvironment from "../util/testSetup";
import { Express } from "express";
import request from "supertest";
import User from "../../src/models/User";
import { v4 as uuidv4 } from "uuid";
import UserDeckCard from "../../src/models/UserDeckCard";
import UserDeck from "../../src/models/UserDeck";
import Card from "../../src/models/Card";

describe("Users", () => {
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
  });

  describe("POST /v1/users", () => {
    it("should return 400 if displayName is not provided", async () => {
      const response = await request(app).post("/v1/users").send({
        username: "john.doe",
        password: "password",
      });
      expect(response.status).toBe(400);
    });

    it("should return 400 if username is not provided", async () => {
      const response = await request(app).post("/v1/users").send({
        displayName: "John Doe",
        password: "password",
      });
      expect(response.status).toBe(400);
    });

    it("should return 400 if password is not provided", async () => {
      const response = await request(app).post("/v1/users").send({
        displayName: "John Doe",
        username: "john.doe",
      });
      expect(response.status).toBe(400);
    });

    it("should create a user", async () => {
      const response = await request(app).post("/v1/users").send({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });

      expect(response.status).toBe(201);
      expect(response.body.displayName).toBe("John Doe");
      expect(response.body.username).toBe("john.doe");

      const user = await User.findOne({
        where: { username: "john.doe" },
        raw: true,
      });
      expect(user).not.toBeNull();
      expect(user?.displayName).toBe("John Doe");
      expect(user?.username).toBe("john.doe");
    });

    it("should return 409 if username already exists", async () => {
      await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });

      const response = await request(app).post("/v1/users").send({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });
      expect(response.status).toBe(409);
    });
  });

  describe("GET /v1/users/:id", () => {
    it("should return 404 if user does not exist", async () => {
      const response = await request(app).get(`/v1/users/${uuidv4()}`);
      expect(response.status).toBe(404);
    });

    it("should return 400 if id is not a valid uuid", async () => {
      const response = await request(app).get("/v1/users/invalid-uuid");
      expect(response.status).toBe(400);
    });

    it("should get a user by id", async () => {
      const user = await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });
      const response = await request(app).get(`/v1/users/${user.id}`);
      expect(response.status).toBe(200);
      expect(response.body.displayName).toBe("John Doe");
      expect(response.body.username).toBe("john.doe");
    });
  });

  describe("PUT /v1/users/:id", () => {
    it("should return 404 if user does not exist", async () => {
      const response = await request(app).put(`/v1/users/${uuidv4()}`).send({
        displayName: "Jane Doe",
      });
      expect(response.status).toBe(404);
    });

    it("should return 400 if no fields are provided", async () => {
      const response = await request(app).put(`/v1/users/${uuidv4()}`);
      expect(response.status).toBe(400);
    });

    it("should return 400 if id is not a valid uuid", async () => {
      const response = await request(app).put("/v1/users/invalid-uuid").send({
        displayName: "Jane Doe",
      });
      expect(response.status).toBe(400);
    });

    it("should update a user", async () => {
      const user = await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });

      const response = await request(app).put(`/v1/users/${user.id}`).send({
        displayName: "Jane Doe",
      });
      expect(response.status).toBe(200);
      expect(response.body.displayName).toBe("Jane Doe");

      const updatedUser = await User.findOne({
        where: { id: user.id },
        raw: true,
      });
      expect(updatedUser?.displayName).toBe("Jane Doe");
    });
  });

  describe("DELETE /v1/users/:id", () => {
    it("should return 404 if user does not exist", async () => {
      const response = await request(app).delete(`/v1/users/${uuidv4()}`);
      expect(response.status).toBe(404);
    });

    it("should return 400 if id is not a valid uuid", async () => {
      const response = await request(app).delete("/v1/users/invalid-uuid");
      expect(response.status).toBe(400);
    });

    it("should delete a user", async () => {
      const user = await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });

      const response = await request(app).delete(`/v1/users/${user.id}`);
      expect(response.status).toBe(200);

      const deletedUser = await User.findOne({
        where: { id: user.id },
      });
      expect(deletedUser).toBeNull();
    });
  });
});
