import { Model, DataTypes, Sequelize } from "sequelize";

class UserDeckCard extends Model {
  static initModel(sequelize: Sequelize) {
    UserDeckCard.init(
      {
        cardId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "card_id",
        },
        userDeckId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: "user_deck_id",
        },
        quantity: {
          type: DataTypes.INTEGER,
          defaultValue: 1,
          field: "quantity",
        },
      },
      {
        sequelize,
        tableName: "user_deck_cards",
      },
    );
  }
}

export default UserDeckCard;
