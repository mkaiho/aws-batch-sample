import { Stack, StackProps } from "aws-cdk-lib";
import {
  CfnComputeEnvironment,
  CfnJobDefinition,
  CfnJobQueue,
} from "aws-cdk-lib/aws-batch";
import {
  CfnRouteTable,
  CfnSubnetRouteTableAssociation,
  GatewayVpcEndpoint,
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpoint,
  InterfaceVpcEndpointAwsService,
  SecurityGroup,
  Subnet,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import {
  CompositePrincipal,
  ManagedPolicy,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface StageContext {
  name: string;
}

export class AwsBatchSampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const env: string = this.node.tryGetContext("env");
    const context: StageContext = this.node.tryGetContext(env);
    const revision = require("child_process")
      .execSync("git rev-parse HEAD")
      .toString()
      .trim();

    /**
     * VPC
     */
    const vpc = new Vpc(this, `${context.name}-vpc`, {
      vpcName: `${context.name}-vpc`,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 0,
      subnetConfiguration: [],
      cidr: "10.0.0.0/16",
    });

    /**
     * Role
     */
    const serviceRole = new Role(this, `${context.name}`, {
      roleName: `${context.name}`,
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("batch.amazonaws.com")
      ),
      managedPolicies: [
        ManagedPolicy.fromManagedPolicyArn(
          this,
          `AWSBatchServiceRole`,
          "arn:aws:iam::aws:policy/service-role/AWSBatchServiceRole"
        ),
      ],
    });

    /**
     * Security Group
     */
    const appSecurityGroup = new SecurityGroup(this, `${context.name}-app-sg`, {
      securityGroupName: `${context.name}-app-sg`,
      vpc: vpc,
      description: "ecs sample",
    });

    /**
     * Subnet
     */
    const appSubnet = new Subnet(this, `${context.name}-app-subnet`, {
      vpcId: vpc.vpcId,
      cidrBlock: "10.0.0.0/24",
      availabilityZone: "ap-northeast-1a",
      mapPublicIpOnLaunch: false,
    });

    /**
     * Route
     */
     const appRtb = new CfnRouteTable(this, `${context.name}-app-rtb`, {
      vpcId: vpc.vpcId,
      tags: [
        {
          key: "Name",
          value: `${context.name}-app-rtb`,
        },
      ],
    });
    const appRtbAsc = new CfnSubnetRouteTableAssociation(
      this,
      `${context.name}-app-rtb-sbn-association`,
      {
        routeTableId: appRtb.ref,
        subnetId: appSubnet.subnetId,
      }
    );
    appRtbAsc.addDependsOn(appRtb)

    /**
     * VPC Endpoint
     */
    const ecrDockerVpce = new InterfaceVpcEndpoint(
      this,
      `${context.name}-vpce-ecr-dkr`,
      {
        service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
        vpc: vpc,
        open: true,
        privateDnsEnabled: true,
        securityGroups: [appSecurityGroup],
        subnets: {
          subnets: [appSubnet],
        },
      }
    );
    const ecrApiVpce = new InterfaceVpcEndpoint(
      this,
      `${context.name}-vpce-ecr-api`,
      {
        service: InterfaceVpcEndpointAwsService.ECR,
        vpc: vpc,
        open: true,
        privateDnsEnabled: true,
        securityGroups: [appSecurityGroup],
        subnets: {
          subnets: [appSubnet],
        },
      }
    );
    const logsVpce = new InterfaceVpcEndpoint(
      this,
      `${context.name}-vpce-logs`,
      {
        service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        vpc: vpc,
        open: true,
        privateDnsEnabled: true,
        securityGroups: [appSecurityGroup],
        subnets: {
          subnets: [appSubnet],
        },
      }
    );
    const s3Vpce = new GatewayVpcEndpoint(this, `${context.name}-vpce-s3`, {
      service: GatewayVpcEndpointAwsService.S3,
      vpc: vpc,
      subnets: [
        {
          subnets: [appSubnet],
        },
      ],
    });

    /**
     * ECR
     */
    const image = this.synthesizer.addDockerImageAsset({
      sourceHash: revision,
      directoryName: `${__dirname}/../../../`,
    });

    /**
     * Batch
     */
    const computeEnvironment = new CfnComputeEnvironment(
      this,
      `${context.name}-compute`,
      {
        type: "MANAGED",
        computeEnvironmentName: `${context.name}-compute`,
        state: "ENABLED",
        serviceRole: serviceRole.roleArn,
        computeResources: {
          type: "FARGATE_SPOT",
          maxvCpus: 50,
          subnets: [appSubnet.subnetId],
          securityGroupIds: [appSecurityGroup.securityGroupId],
        },
      }
    );
    computeEnvironment.addDependsOn(appRtbAsc)

    const jobQueue = new CfnJobQueue(this, `${context.name}-job-queue`, {
      jobQueueName: `${context.name}`,
      priority: 1,
      state: "ENABLED",
      computeEnvironmentOrder: [
        {
          order: 1,
          computeEnvironment:
            computeEnvironment.computeEnvironmentName as string,
        },
      ],
    });
    jobQueue.addDependsOn(computeEnvironment);

    const jobDefinition = new CfnJobDefinition(this, `${context.name}-job`, {
      jobDefinitionName: `${context.name}`,
      type: "container",
      platformCapabilities: ["FARGATE"],
      containerProperties: {
        executionRoleArn: `arn:aws:iam::${
          Stack.of(this).account
        }:role/ecsTaskExecutionRole`,
        image: image.imageUri,
        command: ["cmd/hello"],
        resourceRequirements: [
          {
            type: "MEMORY",
            value: "512",
          },
          {
            type: "VCPU",
            value: "0.25",
          },
        ],
        logConfiguration: {
          logDriver: "awslogs",
        },
        networkConfiguration: {
          assignPublicIp: "ENABLED",
        },
      },
      parameters: {
        args: "hello",
      },
      timeout: {
        attemptDurationSeconds: 300,
      },
    });
  }
}
