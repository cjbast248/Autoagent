#!/bin/bash

# Script to update all Zoho Edge Functions to use per-user credentials

echo "🔄 Updating Zoho Edge Functions to use per-user credentials..."

# List of functions that need the same pattern update
FUNCTIONS=(
  "zoho-crm-update"
  "zoho-crm-delete"
  "zoho-crm-upsert"
  "zoho-crm-get-fields"
  "zoho-crm-get"
  "zoho-import-contacts"
  "zoho-sync-call-log"
)

for func in "${FUNCTIONS[@]}"; do
  echo "📝 Processing $func..."

  file="supabase/functions/$func/index.ts"

  if [ ! -f "$file" ]; then
    echo "  ⚠️  File not found: $file"
    continue
  fi

  echo "  ✅ Found $file"
done

echo ""
echo "✅ All functions identified. Manual updates required for:"
echo "   - refreshToken function signature and implementation"
echo "   - Database query to include client_id, client_secret, zoho_region"
echo "   - API domain selection based on region"
echo "   - refreshToken call to include per-user credentials"

echo ""
echo "Pattern to apply:"
echo "1. Update refreshToken(supabase, user_id, refresh_token, client_id, client_secret, zoho_region)"
echo "2. Add region-based accountsDomain and apiDomain selection"
echo "3. Query: .select('access_token, refresh_token, client_id, client_secret, zoho_region')"
echo "4. Validate client_id and client_secret exist"
echo "5. Use apiDomain variable instead of hardcoded www.zohoapis.eu"
