#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DeployAppToS3AndCloudfrontStack } from '../lib/deploy-app-to-s3-and-cloudfront-stack';

const app = new cdk.App();
new DeployAppToS3AndCloudfrontStack(app, 'DeployAppToS3AndCloudfrontStack', {
    env: { account: 'your_account_id', region: 'us-east-1' },
});