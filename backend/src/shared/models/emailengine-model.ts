import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../config/db";

class EmailEngineInstance extends Model<
  InferAttributes<EmailEngineInstance>,
  InferCreationAttributes<EmailEngineInstance>
> {
  declare id: CreationOptional<string>;
  declare base_url: string;
  declare api_key: string;
  declare gmail_provider: string | null;
  declare outlook_provider: string | null;
  declare accounts_connected: number;
}

EmailEngineInstance.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },

    base_url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    api_key: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    gmail_provider: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    outlook_provider: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    accounts_connected: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "email_engine_instance",
    tableName: "email_engine_instances",

    timestamps: false,
    underscored: true,

    indexes: [
      {
        fields: ["id"],
      },
    ],
  },
);

export { EmailEngineInstance };
