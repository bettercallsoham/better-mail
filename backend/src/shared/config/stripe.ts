import "dotenv/config";

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Stripe Secret key is missing ");
}
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const plans = {
  STARTER: process.env.STARTER_PRICE_ID!,
  PRO: process.env.PRO_PRICE_ID!,
  BUSINESS: process.env.BUSINESS_PRICE_ID,
};
