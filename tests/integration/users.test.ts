import { expect } from "@jest/globals";
import setupTestEnvironment from "../util/testSetup";
import { Express } from "express";
import request from "supertest";
import User from "../../src/models/User";
import UserDeckCard from "../../src/models/UserDeckCard";
import UserDeck from "../../src/models/UserDeck";
import Card from "../../src/models/Card";
import bcrypt from "bcrypt";
import { createUserAndLogin } from "../util/authHelper";

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

  describe("POST /v1/users/signup", () => {
    it("should return 400 if displayName is not provided", async () => {
      const response = await request(app).post("/v1/users/signup").send({
        username: "john.doe",
        password: "password",
      });
      expect(response.status).toBe(400);
    });

    it("should return 400 if username is not provided", async () => {
      const response = await request(app).post("/v1/users/signup").send({
        displayName: "John Doe",
        password: "password",
      });
      expect(response.status).toBe(400);
    });

    it("should return 400 if password is not provided", async () => {
      const response = await request(app).post("/v1/users/signup").send({
        displayName: "John Doe",
        username: "john.doe",
      });
      expect(response.status).toBe(400);
    });

    it("should create a user and salt the password", async () => {
      const response = await request(app).post("/v1/users/signup").send({
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
      expect(user?.createdAt).toBeDefined();
      expect(user?.updatedAt).toBeDefined();
      const userFromDb = (await User.findOne({
        where: { username: "john.doe" },
        raw: true,
      })) as User;
      expect(userFromDb?.password).not.toBe("password");
      const compare = await bcrypt.compare("password", userFromDb?.password);
      const compare2 = await bcrypt.compare(
        "password121212",
        userFromDb?.password,
      );
      expect(compare).toBe(true);
      expect(compare2).toBe(false);
    });

    it("should return 409 if username already exists", async () => {
      await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });

      const response = await request(app).post("/v1/users/signup").send({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });
      expect(response.status).toBe(409);
    });
  });

  describe("GET /v1/users/:id", () => {
    it("should return 401 when not authenticated", async () => {
      const user = await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });
      const response = await request(app).get(`/v1/users/${user.id}`);
      expect(response.status).toBe(401);
    });

    it("should return 403 when trying to access another user's data", async () => {
      const { agent } = await createUserAndLogin(app);

      const otherUser = await User.create({
        displayName: "Other User",
        username: "otheruser",
        password: "password456",
      });

      const response = await agent.get(`/v1/users/${otherUser.id}`);
      expect(response.status).toBe(403);
    });

    it("should return 400 if id is not a valid uuid", async () => {
      const { agent } = await createUserAndLogin(app);

      const response = await agent.get("/v1/users/invalid-uuid");
      expect(response.status).toBe(400);
    });

    it("should get a user's own data when authenticated", async () => {
      const { agent, user } = await createUserAndLogin(app);

      const response = await agent.get(`/v1/users/${user.id}`);
      expect(response.status).toBe(200);
      expect(response.body.displayName).toBe("Test User");
      expect(response.body.username).toBe("testuser");
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });
  });

  describe("PUT /v1/users/:id", () => {
    it("should return 401 when not authenticated", async () => {
      const user = await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });
      const response = await request(app).put(`/v1/users/${user.id}`).send({
        displayName: "Jane Doe",
      });
      expect(response.status).toBe(401);
    });

    it("should return 403 when trying to update another user's data", async () => {
      const { agent } = await createUserAndLogin(app);

      const otherUser = await User.create({
        displayName: "Other User",
        username: "otheruser",
        password: "password456",
      });

      const response = await agent.put(`/v1/users/${otherUser.id}`).send({
        displayName: "Changed Name",
      });
      expect(response.status).toBe(403);
    });

    it("should return 400 if no fields are provided", async () => {
      const { agent, user } = await createUserAndLogin(app);

      const response = await agent.put(`/v1/users/${user.id}`);
      expect(response.status).toBe(400);
    });

    it("should return 400 if id is not a valid uuid", async () => {
      const { agent } = await createUserAndLogin(app);

      const response = await agent.put("/v1/users/invalid-uuid").send({
        displayName: "Jane Doe",
      });
      expect(response.status).toBe(400);
    });

    it("should update a user's own data when authenticated", async () => {
      const { agent, user } = await createUserAndLogin(app);

      const response = await agent.put(`/v1/users/${user.id}`).send({
        displayName: "Updated Name",
      });
      expect(response.status).toBe(200);
      expect(response.body.displayName).toBe("Updated Name");

      const updatedUser = await User.findOne({
        where: { id: user.id },
        raw: true,
      });
      expect(updatedUser?.displayName).toBe("Updated Name");
    });
  });

  describe("DELETE /v1/users/:id", () => {
    it("should return 401 when not authenticated", async () => {
      const user = await User.create({
        displayName: "John Doe",
        username: "john.doe",
        password: "password",
      });
      const response = await request(app).delete(`/v1/users/${user.id}`);
      expect(response.status).toBe(401);
    });

    it("should return 403 when trying to delete another user's data", async () => {
      const { agent } = await createUserAndLogin(app);

      const otherUser = await User.create({
        displayName: "Other User",
        username: "otheruser",
        password: "password456",
      });

      const response = await agent.delete(`/v1/users/${otherUser.id}`);
      expect(response.status).toBe(403);
    });

    it("should return 400 if id is not a valid uuid", async () => {
      const { agent } = await createUserAndLogin(app);

      const response = await agent.delete("/v1/users/invalid-uuid");
      expect(response.status).toBe(400);
    });

    it("should delete a user's own data when authenticated", async () => {
      const { agent, user } = await createUserAndLogin(app);

      const response = await agent.delete(`/v1/users/${user.id}`);
      expect(response.status).toBe(200);

      const deletedUser = await User.findOne({
        where: { id: user.id },
      });
      expect(deletedUser).toBeNull();
    });
  });
});
