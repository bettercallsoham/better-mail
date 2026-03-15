import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../../config/db";

class FeedbackUpvote extends Model<
  InferAttributes<FeedbackUpvote>,
  InferCreationAttributes<FeedbackUpvote>
> {
  declare id: CreationOptional<string>;
  declare postId: string;
  declare userId: string;
  declare created_at: CreationOptional<Date>;
}

FeedbackUpvote.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    postId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "feedback_posts", key: "id" },
      onDelete: "CASCADE",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "feedback_upvote",
    tableName: "feedback_upvotes",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["post_id", "user_id"], // ← prevents double upvotes at DB level
      },
    ],
  },
);

export { FeedbackUpvote };
