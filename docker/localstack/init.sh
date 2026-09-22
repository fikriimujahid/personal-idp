#!/bin/bash
set -euo pipefail

echo "=== LocalStack init: creating AWS resources ==="

export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
ENDPOINT=http://localhost:4566

echo "--- S3: creating Terraform state bucket ---"
aws --endpoint-url="$ENDPOINT" s3 mb s3://fikri-idp-tfstate || true

echo "--- Secrets Manager: seeding dev secrets ---"

aws --endpoint-url="$ENDPOINT" secretsmanager create-secret \
  --name "fikri-idp/dev/cognito-client-secret" \
  --secret-string '{"clientId":"fikri-idp-local","clientSecret":"local-dev-secret-placeholder"}' \
  2>/dev/null || echo "  (already exists)"

aws --endpoint-url="$ENDPOINT" secretsmanager create-secret \
  --name "fikri-idp/dev/github-token" \
  --secret-string '{"token":"ghp_local-dev-placeholder-token"}' \
  2>/dev/null || echo "  (already exists)"

aws --endpoint-url="$ENDPOINT" secretsmanager create-secret \
  --name "fikri-idp/dev/database-credentials" \
  --secret-string '{"username":"fikri_idp","password":"fikri_idp","host":"postgres","port":5432,"dbname":"fikri_idp"}' \
  2>/dev/null || echo "  (already exists)"

echo "--- SQS: creating queues ---"

aws --endpoint-url="$ENDPOINT" sqs create-queue \
  --queue-name fikri-idp-tasks \
  --attributes '{"VisibilityTimeout":"300","MessageRetentionPeriod":"86400"}' \
  2>/dev/null || echo "  (already exists)"

aws --endpoint-url="$ENDPOINT" sqs create-queue \
  --queue-name fikri-idp-tasks-dlq \
  --attributes '{"MessageRetentionPeriod":"1209600"}' \
  2>/dev/null || echo "  (already exists)"

echo "--- DynamoDB: creating Terraform state lock table ---"

aws --endpoint-url="$ENDPOINT" dynamodb create-table \
  --table-name fikri-idp-tfstate-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null || echo "  (already exists)"

echo "=== LocalStack init complete ==="
