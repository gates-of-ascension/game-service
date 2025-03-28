import { Sequelize } from "sequelize";
import User from "./models/user";
import UserDeck from "./models/UserDeck";
import UserDeckCard from "./models/UserDeckCard";
import Card from "./models/card";
import BaseLogger from "./utils/logger";

export default async function initDatabase(
  logger: BaseLogger,
  databaseUrl: string,
) {
  const sequelize = new Sequelize(databaseUrl);
  logger.info("Connecting to database...");

  await sequelize.authenticate();
  logger.info("Database connected!");
  await sequelize.sync();
  logger.info("Database synced!");

  logger.info("Initializing models...");
  User.initModel(sequelize);
  UserDeck.initModel(sequelize);
  UserDeckCard.initModel(sequelize);
  Card.initModel(sequelize);
  logger.info("Models initialized!");

  logger.info("Associating models...");
  UserDeck.belongsTo(User, { foreignKey: "userId", onDelete: "CASCADE" });
  UserDeckCard.belongsTo(UserDeck, {
    foreignKey: "userDeckId",
    onDelete: "CASCADE",
  });
  UserDeckCard.belongsTo(Card, { foreignKey: "cardId", onDelete: "CASCADE" });
  logger.info("Models initialized and associated!");
}
