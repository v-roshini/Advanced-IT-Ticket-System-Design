const { S3Client, ListBucketsCommand, HeadBucketCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

const s3 = new S3Client({
    region: process.env.AWS_REGION || "eu-north-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function testS3() {
    try {
        console.log("Testing S3 access...");
        const res = await s3.send(new HeadBucketCommand({ Bucket: process.env.AWS_BUCKET_NAME }));
        console.log("✅ Bucket access successful:", process.env.AWS_BUCKET_NAME);
    } catch (err) {
        console.error("❌ Bucket access failed:");
        console.error(err);
    }
}
testS3();
