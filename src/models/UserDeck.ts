import { Model, DataTypes, Sequelize } from "sequelize";

class UserDeck extends Model {
  public id!: string;
  public userId!: string;
  public name!: string;
  public description?: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  static initModel(sequelize: Sequelize) {
    UserDeck.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          field: "id",
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: "user_id",
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: "name",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: "description",
        },
        createdAt: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
          field: "created_at",
        },
        updatedAt: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
          field: "updated_at",
        },
      },
      {
        sequelize,
        tableName: "user_decks",
      },
    );
  }
}

export default UserDeck;
