import { Express } from "express";
import request from "supertest";
import User from "../../src/models/User";

export async function createUserAndLogin(app: Express, userData = {}) {
  const defaultUser = {
    displayName: "Test User",
    username: "testuser",
    password: "password123",
    ...userData,
  };

  await request(app).post("/v1/users/signup").send(defaultUser);

  const agent = request.agent(app);
  await agent.post("/v1/users/login").send({
    username: defaultUser.username,
    password: defaultUser.password,
  });

  const user = await User.findOne({
    where: { username: defaultUser.username },
  });

  if (!user) {
    throw new Error("Failed to find created user");
  }

  return {
    agent, // This agent has the authenticated session cookie
    user, // The user object with ID for route parameters
  };
}
