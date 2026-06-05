#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-matchday-surge-agent}"
REGION="${REGION:-us-central1}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project)}"

if [[ -f ".env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

: "${MONGODB_DB:=matchday_surge}"
: "${GOOGLE_CLOUD_LOCATION:=us-central1}"
: "${GOOGLE_GENAI_USE_VERTEXAI:=true}"
: "${GEMINI_MODEL:=gemini-2.5-flash}"

echo "Deploying $SERVICE_NAME to Cloud Run"
echo "Project: $PROJECT_ID"
echo "Region:  $REGION"

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars MONGODB_DB="$MONGODB_DB",GOOGLE_CLOUD_PROJECT="$PROJECT_ID",GOOGLE_CLOUD_LOCATION="$GOOGLE_CLOUD_LOCATION",GOOGLE_GENAI_USE_VERTEXAI="$GOOGLE_GENAI_USE_VERTEXAI",GEMINI_MODEL="$GEMINI_MODEL" \
  --set-secrets MONGODB_URI=MATCHDAY_MONGODB_URI:latest

echo
echo "Deployment complete."
gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.url)'
