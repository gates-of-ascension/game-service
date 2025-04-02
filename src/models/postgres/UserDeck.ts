import { DataTypes, Model, sql } from "@sequelize/core";
import {
  Attribute,
  Default,
  HasMany,
  NotNull,
  PrimaryKey,
  Table,
} from "@sequelize/core/decorators-legacy";
import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from "@sequelize/core";
import User from "./User";
import UserDeckCard from "./UserDeckCard";

@Table({
  tableName: "user_decks",
  timestamps: true,
  underscored: true,
})
class UserDeck extends Model<
  InferAttributes<UserDeck>,
  InferCreationAttributes<UserDeck>
> {
  @PrimaryKey
  @Attribute(DataTypes.UUID)
  @Default(DataTypes.UUIDV4)
  @NotNull
  declare id: CreationOptional<string>;

  @NotNull
  @Attribute(DataTypes.UUID)
  declare userId: string;

  @NotNull
  @Attribute(DataTypes.STRING(255))
  declare name: string;

  @Attribute(DataTypes.TEXT)
  declare description: CreationOptional<string>;

  @NotNull
  @Attribute(DataTypes.DATE)
  @Default(sql`CURRENT_TIMESTAMP`)
  declare createdAt: CreationOptional<Date>;

  @NotNull
  @Attribute(DataTypes.DATE)
  @Default(sql`CURRENT_TIMESTAMP`)
  declare updatedAt: CreationOptional<Date>;
  declare user: NonAttribute<User>;

  @HasMany(() => UserDeckCard, "userDeckId")
  declare userDeckCards?: NonAttribute<UserDeckCard[]>;
}

export default UserDeck;
