#!/bin/sh

# Docker entrypoint script to inject environment variables into the built app

# Create a JavaScript file with environment variables
cat > /usr/share/nginx/html/env-config.js << EOF
window.ENV = {
  SUPABASE_URL: "${SUPABASE_URL}",
  SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}",
  ELEVENLABS_API_KEY: "${ELEVENLABS_API_KEY}",
  ELEVENLABS_BASE_URL: "${VITE_ELEVENLABS_BASE_URL}",
  DEFAULT_MODEL_ID: "${VITE_DEFAULT_MODEL_ID}",
  AGENT_PHONE_NUMBER_ID: "${VITE_AGENT_PHONE_NUMBER_ID}",
  APP_URL: "${VITE_APP_URL}",
  NODE_ENV: "${NODE_ENV}"
};
EOF

# Update the index.html to include the environment configuration
sed -i 's|</head>|<script src="/env-config.js"></script></head>|' /usr/share/nginx/html/index.html

# Execute the original command
exec "$@"
