import { DataTypes, Model, sql } from "@sequelize/core";
import {
  Attribute,
  Default,
  NotNull,
  PrimaryKey,
  Table,
  Unique,
} from "@sequelize/core/decorators-legacy";
import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "@sequelize/core";

@Table({
  tableName: "cards",
  timestamps: true,
  underscored: true,
})
class Card extends Model<InferAttributes<Card>, InferCreationAttributes<Card>> {
  @PrimaryKey
  @Attribute(DataTypes.INTEGER)
  @NotNull
  @Default(DataTypes.INTEGER)
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
}

export default Card;
