import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../config/db";

class TelegramIntegration extends Model<
  InferAttributes<TelegramIntegration>,
  InferCreationAttributes<TelegramIntegration>
> {
  declare integration_id: string;

  declare chat_id: string;
  declare username: string | null;
  declare first_name: string | null;
  declare last_name: string | null;
  declare photo_url: string | null;
}

TelegramIntegration.init(
  {
    integration_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },

    chat_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    username: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    first_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    last_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    photo_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "telegramIntegration",
    tableName: "telegram_integrations",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ["integration_id"],
      },
    ],
  },
);

export { TelegramIntegration };
