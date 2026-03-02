
# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Install Node.js for running edge functions if needed
RUN apk add --no-cache nodejs npm

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Create a startup script to inject environment variables
COPY docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 80

# Set environment variables with defaults (sensitive values must come from .env or runtime)
ENV NODE_ENV=production
ENV VITE_APP_URL=http://localhost
ENV SUPABASE_URL=""
ENV SUPABASE_ANON_KEY=""
ENV VITE_ELEVENLABS_BASE_URL=https://api.elevenlabs.io/v1
ENV VITE_DEFAULT_MODEL_ID=eleven_flash_v2_5
ENV VITE_AGENT_PHONE_NUMBER_ID=""

# Use the startup script as entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
