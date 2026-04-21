import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../config/db";

class EmailAccount extends Model<
  InferAttributes<EmailAccount>,
  InferCreationAttributes<EmailAccount>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare provider: string;
  declare email: string;
  declare name: string | null;
  declare password: string | null;
  declare host: string | null;
  declare refresh_token: string | null;
  declare subscription_id: string | null;
  declare subscription_expiration: Date | null;
  declare avatar_url: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
  declare deleted_at: CreationOptional<Date | null>;
}

EmailAccount.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },

    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    provider: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    email: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    password: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    host: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    subscription_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    subscription_expiration: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    avatar_url: {
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
    modelName: "email_account",
    tableName: "email_accounts",
    paranoid: true,
    timestamps: true,
    underscored: true,

    indexes: [
      {
        fields: ["id"],
      },
      {
        unique: true,
        fields: ["user_id", "email"],
        name: "email_accounts_user_id_email_unique",
      },
    ],
  },
);

export { EmailAccount };
