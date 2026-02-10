import { User } from "./user-model";
import { Subscription } from "./subscription-model";
import { Plan } from "./plan-model";
import { EmailAccount } from "./emailAccount.model";
import { EmailEngineInstance } from "./emailengine-model";
import { EmailTemplate } from "./email-template.model";

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
