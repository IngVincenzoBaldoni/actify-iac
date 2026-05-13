#!/usr/bin/env bash
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────────────
FUNCTION_NAME="actify-saas-pdf-generator"
S3_BUCKET="actify-saas-reports-temp"
S3_KEY="deployments/function.zip"
REGION="eu-central-1"
LAMBDA_DIR="$(cd "$(dirname "$0")/lambda-pdf" && pwd)"

# ─── Helpers ──────────────────────────────────────────────────────────────────
bold="\033[1m"; green="\033[32m"; red="\033[31m"; reset="\033[0m"
step() { echo -e "\n${bold}▶ $1${reset}"; }
ok()   { echo -e "${green}✔ $1${reset}"; }
fail() { echo -e "${red}✘ $1${reset}"; exit 1; }

# ─── Pre-flight ───────────────────────────────────────────────────────────────
step "Pre-flight checks"
command -v aws  >/dev/null 2>&1 || fail "aws CLI non trovato"
command -v node >/dev/null 2>&1 || fail "node non trovato"
command -v npm  >/dev/null 2>&1 || fail "npm non trovato"
aws sts get-caller-identity --region "$REGION" --output text --query Account >/dev/null 2>&1 \
  || fail "AWS credentials non valide o non configurate"
ok "Tutto pronto"

# ─── Build ────────────────────────────────────────────────────────────────────
step "Build Lambda (tsc + bundle)"
cd "$LAMBDA_DIR"
npm install --silent
npm run build
ZIP="$LAMBDA_DIR/dist/function.zip"
[[ -f "$ZIP" ]] || fail "function.zip non trovato dopo il build"
ZIP_MB=$(du -m "$ZIP" | cut -f1)
ok "function.zip generato — ${ZIP_MB} MB"

# ─── Upload S3 ────────────────────────────────────────────────────────────────
step "Upload su S3 (s3://${S3_BUCKET}/${S3_KEY})"
aws s3 cp "$ZIP" "s3://${S3_BUCKET}/${S3_KEY}" --region "$REGION"
ok "Upload completato"

# ─── Deploy Lambda ────────────────────────────────────────────────────────────
step "Deploy Lambda (${FUNCTION_NAME})"
UPDATE_OUT=$(aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --s3-bucket "$S3_BUCKET" \
  --s3-key "$S3_KEY" \
  --region "$REGION" \
  --output json)

LAST_MODIFIED=$(echo "$UPDATE_OUT" | grep -o '"LastModified": "[^"]*"' | cut -d'"' -f4)
ok "Lambda aggiornata — ${LAST_MODIFIED}"

# ─── Wait for update to complete ──────────────────────────────────────────────
step "Attesa fine update..."
aws lambda wait function-updated \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION"
ok "Lambda attiva e pronta"

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${bold}${green}🚀  Deploy completato!${reset}"
echo -e "   Endpoint: https://lql1qfmdua.execute-api.${REGION}.amazonaws.com/"
echo ""
