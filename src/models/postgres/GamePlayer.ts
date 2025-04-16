import { DataTypes, Model } from "@sequelize/core";
import {
  Attribute,
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
  tableName: "game_players",
  timestamps: true,
  underscored: true,
})
export class GamePlayer extends Model<
  InferAttributes<GamePlayer>,
  InferCreationAttributes<GamePlayer>
> {
  @PrimaryKey
  @Attribute(DataTypes.UUID)
  @NotNull
  declare gameId: CreationOptional<string>;

  @PrimaryKey
  @Attribute(DataTypes.UUID)
  @NotNull
  declare userId: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare result: string;
}
