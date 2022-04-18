import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { ApplicationLoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancingv2"
import {
    OriginAccessIdentity,
    AllowedMethods,
    ViewerProtocolPolicy,
    OriginProtocolPolicy,
    Distribution,
} from "aws-cdk-lib/aws-cloudfront";

export class DeployAppToS3AndCloudfrontStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // VPC
        const vpc = new Vpc(this, "applicationVPC", {
            maxAzs: 2,
            natGateways: 1,
        });

        // ALB 
        const alb = new ApplicationLoadBalancer(this, 'ALB', {
            vpc: vpc,
            internetFacing: true,
            loadBalancerName: 'applicationLB'
        });

        // Web hosting bucket
        const websiteBucket = new Bucket(this, "websiteBucket", {
            versioned: false,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        // Trigger frontend deployment
        new BucketDeployment(this, "websiteDeployment", {
            sources: [Source.asset("application/build")],
            destinationBucket: websiteBucket as any
        });

        // Create Origin Access Identity for CloudFront
        const originAccessIdentity = new OriginAccessIdentity(this, "cloudfrontOAI", {
            comment: "OAI for web application cloudfront distribution",
        });

        // Creating CloudFront distribution
        let cloudFrontDist = new Distribution(this, "cloudfrontDist", {
            defaultRootObject: "index.html",
            defaultBehavior: {
                origin: new origins.S3Origin(websiteBucket as any, {
                    originAccessIdentity: originAccessIdentity as any,
                }) as any,
                compress: true,
                allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                viewerProtocolPolicy: ViewerProtocolPolicy.ALLOW_ALL,
            },
        });

        // Creating custom origin for the application load balancer
        new origins.HttpOrigin(alb.loadBalancerDnsName, {
            protocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
        });

        // Output the CouldFront domain to test connection
        new CfnOutput(this, "cloudfrontDomainUrl", {
            value: cloudFrontDist.distributionDomainName,
            exportName: "cloudfrontDomainUrl",
        });
    }
}
