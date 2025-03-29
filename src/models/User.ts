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
  tableName: "users",
  timestamps: true,
  underscored: true,
})
export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  @PrimaryKey
  @Attribute(DataTypes.UUID)
  @Default(sql`gen_random_uuid()`)
  @NotNull
  declare id: CreationOptional<string>;

  @NotNull
  @Unique
  @Attribute(DataTypes.STRING(255))
  declare displayName: string;

  @NotNull
  @Unique
  @Attribute(DataTypes.STRING(255))
  declare username: string;

  @NotNull
  @Attribute(DataTypes.STRING(255))
  declare password: string;

  @NotNull
  @Attribute(DataTypes.DATE)
  @Default(sql`CURRENT_TIMESTAMP`)
  declare createdAt: CreationOptional<Date>;

  @NotNull
  @Attribute(DataTypes.DATE)
  @Default(sql`CURRENT_TIMESTAMP`)
  declare updatedAt: CreationOptional<Date>;
}

export default User;
