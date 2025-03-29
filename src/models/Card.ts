import { Model, DataTypes, Sequelize } from "sequelize";

class Card extends Model {
  static initModel(sequelize: Sequelize) {
    Card.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          field: "id",
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
        type: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: "type",
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
        tableName: "cards",
      },
    );
  }
}

export default Card;
