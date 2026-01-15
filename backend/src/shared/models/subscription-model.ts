import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../config/db";

class Subscription extends Model<
  InferAttributes<Subscription>,
  InferCreationAttributes<Subscription>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare plan_id: string;
  declare status: string;

  declare started_at: Date;
  declare ends_at: Date | null;
  declare canceled_at: Date | null;
  declare created_at: CreationOptional<Date>;
}

Subscription.init(
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
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "plans",
        key: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },

    status: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    ends_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    canceled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "subscription",
    tableName: "subscriptions",
    timestamps: false,
    underscored: true,
    indexes: [{ fields: ["id"] }],
  }
);


export { Subscription };
