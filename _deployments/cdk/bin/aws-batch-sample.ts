#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsBatchSampleStack } from '../lib/aws-batch-sample-stack';
import { JobStatusObserverStack } from '../lib/job-status-observer-stack';

const app = new cdk.App();

new AwsBatchSampleStack(app, 'AwsBatchSampleStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

new JobStatusObserverStack(app, 'JobStatusObserverStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});