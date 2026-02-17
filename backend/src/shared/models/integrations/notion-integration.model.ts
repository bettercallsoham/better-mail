import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../config/db";

class NotionIntegration extends Model<
  InferAttributes<NotionIntegration>,
  InferCreationAttributes<NotionIntegration>
> {
  declare integration_id: string;

  declare workspace_id: string;
  declare workspace_name: string | null;
  declare bot_id: string;
}

NotionIntegration.init(
  {
    integration_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },

    workspace_id: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    workspace_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    bot_id: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "notionIntegration",
    tableName: "notion_integrations",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ["integration_id"],
      },
    ],
  },
);

export { NotionIntegration };
