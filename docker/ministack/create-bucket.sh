#!/bin/sh
# Creates the bucket the s3 storage driver expects, in the region the app signs with (other regions get a 301).
set -e

export AWS_DEFAULT_REGION="${S3_REGION:-us-east-1}"
BUCKET="${S3_BUCKET:-videoreview-bucket}"

aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null || aws s3 mb "s3://$BUCKET"

aws s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration "file://$MINISTACK_INIT_SCRIPT_DIR/s3.cors.json"
