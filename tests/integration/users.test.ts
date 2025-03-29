import { expect } from "@jest/globals";
import setupTestEnvironment from "../util/testSetup";
import { Express } from "express";
import request from "supertest";
import User from "../../src/models/User";
import { v4 as uuidv4 } from "uuid";

describe("Users", () => {
  let app: Express;

  beforeAll(async () => {
    const { app: testApp } = await setupTestEnvironment();
    app = testApp;
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
});
