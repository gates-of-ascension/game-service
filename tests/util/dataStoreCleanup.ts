import User from "../../src/models/postgres/User";
import UserDeck from "../../src/models/postgres/UserDeck";
import UserDeckCard from "../../src/models/postgres/UserDeckCard";
import Card from "../../src/models/postgres/Card";
import { RedisClient } from "../../src/initDatastores";

export async function cleanupDataStores(redisClient: RedisClient) {
  await UserDeckCard.destroy({ where: {} });
  await UserDeck.destroy({ where: {} });
  await Card.destroy({ where: {} });
  await User.destroy({ where: {} });
  await redisClient.flushAll();
}
