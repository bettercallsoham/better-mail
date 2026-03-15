import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../../config/db";

export enum PostType {
  FEATURE_REQUEST = "feature_request",
  BUG_REPORT = "bug_report",
  IMPROVEMENT = "improvement",
  QUESTION = "question",
}

export enum PostStatus {
  OPEN = "open",
  UNDER_REVIEW = "under_review",
  CLOSED = "closed",
}

class FeedbackPost extends Model<
  InferAttributes<FeedbackPost>,
  InferCreationAttributes<FeedbackPost>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare type: PostType;
  declare status: CreationOptional<PostStatus>;
  declare title: string;
  declare description: string;
  declare attachments: CreationOptional<string[]>;
  declare upvoteCount: CreationOptional<number>;
  declare commentCount: CreationOptional<number>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
  declare deleted_at: CreationOptional<Date | null>;
}

FeedbackPost.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    type: {
      type: DataTypes.ENUM(...Object.values(PostType)),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PostStatus)),
      allowNull: false,
      defaultValue: PostStatus.OPEN,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    attachments: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    upvoteCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    commentCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "feedback_post",
    tableName: "feedback_posts",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    indexes: [
      { fields: ["user_id"] },
      { fields: ["type"] },
      { fields: ["status"] },
      { fields: ["created_at"] },
    ],
  },
);

export { FeedbackPost };
