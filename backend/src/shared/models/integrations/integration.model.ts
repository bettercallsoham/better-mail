import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../../config/db";
import { NonAttribute } from "sequelize";
import { TelegramIntegration } from "./telegram-integration.model";
import { SlackIntegration } from "./slack-integration.model";
import { NotionIntegration } from "./notion-integration.model";

export enum IntegrationProvider {
  TELEGRAM = "telegram",
  SLACK = "slack",
  NOTION = "notion",
  GOOGLE = "google",
}

export enum IntegrationStatus {
  PENDING = "pending",
  ACTIVE = "active",
  REVOKED = "revoked",
}

class Integration extends Model<
  InferAttributes<Integration>,
  InferCreationAttributes<Integration>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;

  declare provider: IntegrationProvider;
  declare status: CreationOptional<IntegrationStatus>;

  // OAuth-based integrations
  declare access_token: string | null;
  declare refresh_token: string | null;
  declare expires_at: Date | null;

  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
  declare telegram?: NonAttribute<TelegramIntegration>;
  declare slack?: NonAttribute<SlackIntegration>;
  declare notion?: NonAttribute<NotionIntegration>;
}

Integration.init(
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
    },

    provider: {
      type: DataTypes.ENUM(
        IntegrationProvider.TELEGRAM,
        IntegrationProvider.SLACK,
        IntegrationProvider.NOTION,
        IntegrationProvider.GOOGLE,
      ),
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM(
        IntegrationStatus.PENDING,
        IntegrationStatus.ACTIVE,
        IntegrationStatus.REVOKED,
      ),
      allowNull: false,
      defaultValue: IntegrationStatus.PENDING,
    },

    access_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    expires_at: {
      type: DataTypes.DATE,
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
  },
  {
    sequelize,
    modelName: "integration",
    tableName: "integrations",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["id"],
      },
    ],
  },
);

export { Integration };
