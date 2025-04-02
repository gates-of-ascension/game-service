import { DataTypes, Model } from "@sequelize/core";
import {
  Attribute,
  Default,
  NotNull,
  PrimaryKey,
  Table,
} from "@sequelize/core/decorators-legacy";
import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "@sequelize/core";

@Table({
  tableName: "user_deck_cards",
  timestamps: false,
  underscored: true,
})
class UserDeckCard extends Model<
  InferAttributes<UserDeckCard>,
  InferCreationAttributes<UserDeckCard>
> {
  @NotNull
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  declare cardId: number;

  @NotNull
  @Attribute(DataTypes.UUID)
  @PrimaryKey
  declare userDeckId: string;

  @Default(1)
  @Attribute(DataTypes.INTEGER)
  declare quantity: CreationOptional<number>;
}

export default UserDeckCard;
