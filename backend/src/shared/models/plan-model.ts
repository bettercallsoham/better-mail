import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../config/db";

class Plan extends Model<InferAttributes<Plan>, InferCreationAttributes<Plan>> {
  declare id: CreationOptional<string>;
  declare code: string;
  declare name: string;
  declare price: string;
  declare ai_credits: number;
  declare accounts_limit: number;
}

Plan.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },

    code: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    price: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    ai_credits: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    accounts_limit: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "plan",
    tableName: "plans",
    timestamps: false,
    underscored: true,
    indexes: [{ fields: ["id"] }],
  }
);


export { Plan };
