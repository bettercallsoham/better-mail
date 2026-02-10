import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
} from "sequelize";
import { sequelize } from "../config/db";
import { User } from "./user-model";

export interface TemplateVariable {
  name: string;
  description: string;
  default?: string;
}

class EmailTemplate extends Model<
  InferAttributes<EmailTemplate>,
  InferCreationAttributes<EmailTemplate>
> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<string>;
  declare name: string;
  declare subject: string;
  declare body: CreationOptional<string | null>;
  declare variables: CreationOptional<TemplateVariable[]>;
  declare category: CreationOptional<string | null>;
  declare tags: CreationOptional<string[]>;
  declare version: CreationOptional<number>;
  declare usageCount: CreationOptional<number>;
  declare lastUsedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

EmailTemplate.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
      onDelete: "CASCADE",
      field: "user_id",
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "body",
    },

    variables: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "usage_count",
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_used_at",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "email_templates",
    timestamps: true,
    underscored: false,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    indexes: [
      {
        unique: true,
        fields: ["user_id", "name"],
        name: "unique_user_template_name",
      },
      {
        fields: ["name"],
        name: "idx_template_name",
      },
    ],
  },
);

export { EmailTemplate };
