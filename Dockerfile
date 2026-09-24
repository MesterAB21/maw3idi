FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG API_BACKEND_URL=https://maw3idi-backend-wo23.onrender.com
ARG META_APP_SECRET=maw3idi-test-meta-app-secret
ARG NEXT_PUBLIC_TEST_AGENT_URL=https://maw3idi-agent-7z4f.onrender.com/webhooks/test
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_BACKEND_URL=$API_BACKEND_URL
ENV NEXT_PUBLIC_META_APP_SECRET=$META_APP_SECRET
ENV NEXT_PUBLIC_TEST_AGENT_URL=$NEXT_PUBLIC_TEST_AGENT_URL
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]