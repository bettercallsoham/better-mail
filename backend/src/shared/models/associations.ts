import { User } from "./user-model";
import { Subscription } from "./subscription-model";
import { Plan } from "./plan-model";
import { EmailAccount } from "./emailAccount.model";
import { EmailEngineInstance } from "./emailengine-model";
import { EmailTemplate } from "./email-template.model";
import { Integration } from "./integrations/integration.model";
import { TelegramIntegration } from "./integrations/telegram-integration.model";
import { SlackIntegration } from "./integrations/slack-integration.model";
import { NotionIntegration } from "./integrations/notion-integration.model";
import { FeedbackPost } from "./feedback/feedback_post.model";
import { FeedbackComment } from "./feedback/feedback_comment.model";

User.hasMany(Subscription, {
  foreignKey: "user_id",
  as: "subscriptions",
});
Subscription.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

Plan.hasMany(Subscription, {
  foreignKey: "plan_id",
  as: "subscriptions",
});
Subscription.belongsTo(Plan, {
  foreignKey: "plan_id",
  as: "plan",
});

User.hasMany(EmailAccount, {
  foreignKey: "user_id",
  as: "emailAccounts",
});
EmailAccount.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

EmailEngineInstance.hasMany(EmailAccount, {
  foreignKey: "email_engine_instance_id",
  as: "emailAccounts",
});
EmailAccount.belongsTo(EmailEngineInstance, {
  foreignKey: "email_engine_instance_id",
  as: "emailEngineInstance",
});

User.hasMany(EmailTemplate, {
  foreignKey: "user_id",
  as: "emailTemplates",
});
EmailTemplate.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

User.hasMany(Integration, {
  foreignKey: "user_id",
  as: "integrations",
});
Integration.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// Telegram 1:1
Integration.hasOne(TelegramIntegration, {
  foreignKey: "integration_id",
  as: "telegram",
});
TelegramIntegration.belongsTo(Integration, {
  foreignKey: "integration_id",
});

// Slack 1:1
Integration.hasOne(SlackIntegration, {
  foreignKey: "integration_id",
  as: "slack",
});
SlackIntegration.belongsTo(Integration, {
  foreignKey: "integration_id",
});

// Notion 1:1
Integration.hasOne(NotionIntegration, {
  foreignKey: "integration_id",
  as: "notion",
});
NotionIntegration.belongsTo(Integration, {
  foreignKey: "integration_id",
});

FeedbackPost.belongsTo(User, { as: "author", foreignKey: "userId" });
User.hasMany(FeedbackPost, { as: "posts", foreignKey: "userId" });

FeedbackComment.belongsTo(User, { as: "author", foreignKey: "userId" });
User.hasMany(FeedbackComment, { as: "comments", foreignKey: "userId" });

FeedbackPost.hasMany(FeedbackComment, { as: "comments", foreignKey: "postId" });
FeedbackComment.belongsTo(FeedbackPost, { as: "post", foreignKey: "postId" });