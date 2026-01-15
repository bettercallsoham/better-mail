import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../config/db";

export enum SignupMethod {
  GMAIL = "gmail",
  OUTLOOK = "outlook",
  SMTP = "smtp",
}

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare fullName: string;
  declare email: string;
  declare password: string;
  declare avatar: string;
  declare signupMethod: SignupMethod;
  declare refreshToken: CreationOptional<string | null>;

  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
  declare deleted_at: CreationOptional<Date | null>;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },

    fullName: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    email: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },

    password: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    avatar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    signupMethod: {
      type: DataTypes.ENUM(
        SignupMethod.GMAIL,
        SignupMethod.OUTLOOK,
        SignupMethod.SMTP
      ),
      allowNull: false,
    },

    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "user",
    tableName: "users",

    timestamps: true,
    underscored: true,

    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",

    paranoid: true,

    indexes: [
      {
        fields: ["id"],
      },
    ],
  }
);
User.sync({ alter: true });

export { User };
