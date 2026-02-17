import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../config/db";

class SlackIntegration extends Model<
  InferAttributes<SlackIntegration>,
  InferCreationAttributes<SlackIntegration>
> {
  declare integration_id: string;

  declare team_id: string;
  declare bot_user_id: string;
}

SlackIntegration.init(
  {
    integration_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },

    team_id: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    bot_user_id: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "slackIntegration",
    tableName: "slack_integrations",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ["integration_id"],
      },
    ],
  },
);

export { SlackIntegration };
