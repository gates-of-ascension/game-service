import { DataTypes, Model, sql } from "@sequelize/core";
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
  NonAttribute,
} from "@sequelize/core";
import { HasMany } from "@sequelize/core/decorators-legacy";
import { GamePlayer } from "./GamePlayer";
import { GameStateHistory } from "./GameStateHistory";

@Table({
  tableName: "games",
  timestamps: true,
  underscored: true,
})
export class Game extends Model<
  InferAttributes<Game>,
  InferCreationAttributes<Game>
> {
  @PrimaryKey
  @Attribute(DataTypes.UUID)
  @Default(sql`gen_random_uuid()`)
  @NotNull
  declare id: CreationOptional<string>;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare turns: number;

  @Attribute(DataTypes.BOOLEAN)
  @NotNull
  declare isActive: boolean;

  @Attribute(DataTypes.DATE)
  @NotNull
  declare createdAt: Date;

  @Attribute(DataTypes.DATE)
  @NotNull
  declare updatedAt: Date;

  @HasMany(() => GamePlayer, "gameId")
  declare players: NonAttribute<GamePlayer[]>;

  @HasMany(() => GameStateHistory, "gameId")
  declare stateHistory: NonAttribute<GameStateHistory[]>;
}
