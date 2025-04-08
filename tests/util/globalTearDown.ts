import Sequelize from "@sequelize/core";
import { RedisClient } from "../../src/initDatastores";
import http from "http";

export default async function globalTearDown(
  sequelize?: Sequelize,
  redisClient?: RedisClient,
  server?: http.Server,
) {
  if (sequelize) {
    await sequelize.close();
  }
  if (redisClient) {
    await redisClient.quit();
  }
  if (server) {
    server.close();
  }
}
