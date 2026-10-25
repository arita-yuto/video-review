#!/bin/sh
# Turns video-processing-lambda.zip (npm run video-processing:package-lambda) into a Lambda the bucket invokes
# for every uploaded video. Without the zip the video-processing container stays the only processor.
set -e

ZIP=/lambda/video-processing-lambda.zip
if [ ! -f "$ZIP" ]; then
    echo "video-processing lambda: $ZIP not found, skipping"
    exit 0
fi

export AWS_DEFAULT_REGION="${S3_REGION:-us-east-1}"
BUCKET="${S3_BUCKET:-videoreview-bucket}"

ARN=$(aws lambda create-function --function-name video-processing --runtime nodejs24.x --handler index.handler \
    --role arn:aws:iam::000000000000:role/video-processing --zip-file "fileb://$ZIP" --timeout 900 \
    --environment "Variables={DATABASE_URL=$DATABASE_URL,VIDEO_REVIEW_STORAGE=s3,S3_BUCKET=$BUCKET,S3_REGION=$AWS_DEFAULT_REGION,S3_ENDPOINT=http://localhost:4566}" \
    --query FunctionArn --output text)

aws lambda wait function-active-v2 --function-name video-processing

aws s3api put-bucket-notification-configuration --bucket "$BUCKET" --notification-configuration \
    "{\"LambdaFunctionConfigurations\":[{\"LambdaFunctionArn\":\"$ARN\",\"Events\":[\"s3:ObjectCreated:*\"],\"Filter\":{\"Key\":{\"FilterRules\":[{\"Name\":\"prefix\",\"Value\":\"videos/\"}]}}}]}"
