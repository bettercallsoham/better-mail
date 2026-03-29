### BETTERMAIL - BETTER WAY TO MANAGE EMAIL WITH AI

Too lazy to write docs , but that's how you can run it in local.

[DON'T FORGET TO LEAVE A STAR 🌟]

To start backend :

```bash
  git clone https://github.com/nerdyabhi/better-mail.git
  cd backend
  pnpm i
```

then add this in your `.env` file

```js
# Sentry
SENTRY_DSN= #For monitoring and logging

APP_PORT=3001

#DATABASE
PG_CONNECTION_STRING=

#REDIS
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=


OUTLOOK_CLIENT_STATE=


OUTLOOK_WEBHOOK_URL=
ELASTIC_API_KEY=
ELASTIC_NODE=
ELASTIC_PASSWORD=

#### NOT GETTING USED
#STARTER_PRICE_ID=
#PRO_PRICE_ID=
#BUSINESS_PRICE_ID=

#STRIPE_PUBLISHABLE_KEY=
#STRIPE_SECRET_KEY=

JWT_SECRET=

CLOUDINARY_URL=
CLOUDINARY_CLOUDNAME=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GMAIL_PUBSUB_TOPIC=


OUTLOOK_CLIENT_ID=
OUTLOOK_CLIENT_SECRET=
OUTLOOK_REDIRECT_URI=

OUTLOOK_CONNECT_REDIRECT_URI=
GOOGLE_CONNECT_REDIRECT_URI=

MICROSOFT_TENANT_ID=common

## NOT GETTING USED EITHER
#EMAIL_ENGINE_PASSWORD=
#EMAIL_ENGINE_ACCESS_TOKEN=



### BULLBOARD

BULLBOARD_USERNAME=
BULLBOARD_PASSWORD=

# Enable BullBoard in production (false by default for security)
BULLBOARD_ENABLED=true

# Development mode - allows access without auth (NEVER use in production!)
BULLBOARD_DEV_MODE=false

# Optional: IP Whitelist (comma-separated IPs allowed to access dashboard)
# Uncomment and add your IPs in production
# BULLBOARD_ALLOWED_IPS=




## AZURE OPENAI
AZURE_OPEN_AI_KEY=
GPT_41_ENDPOINT=
GPT_41_MODEL=
GPT_41_API_VERSION=

GPT_4O_MINI_ENDPOINT=
GPT_4O_MINI_MODEL=
GPT_4O_MINI_VERSION=
### EMBEDDINGS _ OPENAI
EMBEDDINGS_ENDPOINT=
EMBEDDINGS_MODEL_NAME="
EMBEDDINGS_MODEL_DEPLOYMENT=


### SOKETI - APP CONNECTION
SOKETI_DEFAULT_APP_ID=
SOKETI_DEFAULT_APP_KEY=
SOKETI_DEFAULT_APP_SECRET=


TELEGRAM_BOT_TOKEN=
# TELEGRAM_BOT_TOKEN=

TELEGRAM_BOT_USERNAME=
FRONTEND_URL=
ALLOWED_IP=

AZURE_LANGUAGE_ENDPOINT=
AZURE_LANGUAGE_KEY=



```

Then do run this command to start backend server in development mode.

```bash
  pnpm run dev
```

And To run workers use this command

```bash
  pnpm run dev:worker
```

## Start Frontend

This one is quite easy

```bash
cd frontend
pnpm i
```

add this to `frontend/.env`

```js
NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

NEXT_PUBLIC_PUSHER_KEY=your-key
NEXT_PUBLIC_SOKETI_HOST="your soketi host"

NODE_ENV="development"
```

Run it in dev server or

```bash
 pnpm run dev
```

```bash
 pnpm run build
 pnpm run start
```
