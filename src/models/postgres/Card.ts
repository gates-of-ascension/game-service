import { DataTypes, Model, sql } from "@sequelize/core";
import {
  Attribute,
  Default,
  HasMany,
  NotNull,
  PrimaryKey,
  Table,
  Unique,
} from "@sequelize/core/decorators-legacy";
import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from "@sequelize/core";
import UserDeckCard from "./UserDeckCard";

@Table({
  tableName: "cards",
  timestamps: true,
  underscored: true,
})
class Card extends Model<InferAttributes<Card>, InferCreationAttributes<Card>> {
  @PrimaryKey
  @Attribute({ type: DataTypes.INTEGER, autoIncrement: true })
  @NotNull
  declare id: CreationOptional<number>;

  @NotNull
  @Unique
  @Attribute(DataTypes.STRING(255))
  declare name: string;

  @Attribute(DataTypes.TEXT)
  declare description: CreationOptional<string>;

  @NotNull
  @Attribute(DataTypes.STRING(255))
  declare type: string;

  @NotNull
  @Attribute(DataTypes.DATE)
  @Default(sql`CURRENT_TIMESTAMP`)
  declare createdAt: CreationOptional<Date>;

  @NotNull
  @Attribute(DataTypes.DATE)
  @Default(sql`CURRENT_TIMESTAMP`)
  declare updatedAt: CreationOptional<Date>;

  @HasMany(() => UserDeckCard, "cardId")
  declare userDeckCards?: NonAttribute<UserDeckCard[]>;
}

export default Card;
