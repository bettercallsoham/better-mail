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
  declare password: string | null;
  declare host: string | null;
  declare refresh_token: string | null;
  declare email_engine_id: string | null;
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

    email_engine_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "email_engine_instances",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
  },
  {
    sequelize,
    modelName: "email_account",
    tableName: "email_accounts",

    timestamps: false,
    underscored: true,

    indexes: [
      {
        fields: ["id"],
      },
    ],
  }
);

export { EmailAccount };
