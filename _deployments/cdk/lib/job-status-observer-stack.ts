import { Duration, Stack, StackProps } from "aws-cdk-lib";
import {
  ManagedPolicy,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as path from "path"

interface StageContext {
  name: string;
  jobStatusObserver: lambdaConfig
}

interface lambdaConfig {
  name: string;
  timeout: number;
  memory: number;
  retryAttempts: number
}

export class JobStatusObserverStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const env: string = this.node.tryGetContext("env");
    const context: StageContext = this.node.tryGetContext(env);
    const appConfig = context.jobStatusObserver

    /**
     * Role
     */
    const executionRole = new Role(this, `${appConfig.name}-role`, {
      roleName: `${appConfig.name}`,
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ManagedPolicy.fromAwsManagedPolicyName('AWSBatchFullAccess'),
      ],
    });

    const jobStatusObserverLambda = new lambda.Function(this, `${appConfig.name}-lambda`, {
      functionName: `${appConfig.name}-lambda`,
      runtime: lambda.Runtime.GO_1_X,
      code: lambda.Code.fromAsset(path.resolve(__dirname, `../../zip/cmd/${appConfig.name}.zip`)),
      handler:  `${appConfig.name}`,
      role: executionRole,
      timeout: Duration.seconds(appConfig.timeout),
      memorySize: appConfig.memory,
      retryAttempts: appConfig.retryAttempts,
    })
  }
}
