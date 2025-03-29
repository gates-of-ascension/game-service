import { Model, DataTypes, Sequelize } from "sequelize";

class User extends Model {
  public id!: string;
  public displayName!: string;
  public username!: string;
  public password!: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  static initModel(sequelize: Sequelize) {
    User.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          field: "id",
        },
        displayName: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: "display_name",
        },
        username: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
          field: "username",
        },
        password: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: "password",
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
        tableName: "users",
      },
    );
  }

  static async createUser(
    displayName: string,
    username: string,
    password: string,
  ) {
    return await User.create({ displayName, username, password });
  }

  static async findUserById(id: string) {
    return await User.findByPk(id);
  }

  static async updateUser(
    id: string,
    updates: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>,
  ) {
    const user = await User.findByPk(id);
    if (user) {
      return await user.update(updates);
    }
    return null;
  }

  static async getAllUsers() {
    return await User.findAll();
  }

  static async deleteUser(id: string) {
    const user = await User.findByPk(id);
    if (user) {
      return await user.destroy();
    }
    return null;
  }
}

export default User;
