import { DataTypes, Model } from "@sequelize/core";
import {
  Attribute,
  NotNull,
  PrimaryKey,
  Table,
} from "@sequelize/core/decorators-legacy";
import type { InferAttributes, InferCreationAttributes } from "@sequelize/core";

@Table({
  tableName: "game_state_history",
  timestamps: false,
  underscored: true,
})
export class GameStateHistory extends Model<
  InferAttributes<GameStateHistory>,
  InferCreationAttributes<GameStateHistory>
> {
  @PrimaryKey
  @Attribute(DataTypes.UUID)
  @NotNull
  declare gameId: string;

  @Attribute(DataTypes.JSONB)
  @NotNull
  declare state: Record<string, unknown>;

  @Attribute(DataTypes.DATE)
  @NotNull
  declare createdAt: Date;
}
