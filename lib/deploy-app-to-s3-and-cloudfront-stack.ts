import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { ARecord, RecordTarget, HostedZone } from "aws-cdk-lib/aws-route53"
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets"
import {
    OriginAccessIdentity,
    AllowedMethods,
    ViewerProtocolPolicy,
    Distribution,
} from "aws-cdk-lib/aws-cloudfront";

export class DeployAppToS3AndCloudfrontStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        //Lookup the zone based on domain name
        const zone = HostedZone.fromLookup(this, 'baseZone', {
             domainName: "thabolebelo.com"
        });

        // SSL certificate 
        const certificateArn = Certificate.fromCertificateArn(this, "tlsCertificate", "your_certificate_arn");

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
        const cloudFrontDist = new Distribution(this, "cloudfrontDist", {
            defaultRootObject: "index.html",
            domainNames: ["application.thabolebelo.com"],
            certificate: certificateArn,
            defaultBehavior: {
                origin: new S3Origin(websiteBucket as any, {
                    originAccessIdentity: originAccessIdentity as any,
                }) as any,
                compress: true,
                allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
        });

        const applicationURL = new ARecord(this, "appURL", {
            zone: zone,
            recordName: "application.thabolebelo.com",
            target: RecordTarget.fromAlias(new CloudFrontTarget(cloudFrontDist))
        })

        // Output the application URL to test connection
        new CfnOutput(this, "applicationURL", {
            value: applicationURL.domainName,
            exportName: "applicationURL",
        });
    }
}
