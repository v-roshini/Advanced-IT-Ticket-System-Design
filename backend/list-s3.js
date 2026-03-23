const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

const s3 = new S3Client({
    region: process.env.AWS_REGION || "eu-north-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function listBuckets() {
    try {
        console.log("Listing buckets...");
        const res = await s3.send(new ListBucketsCommand({}));
        console.log("✅ Buckets found:", res.Buckets.map(b => b.Name));
    } catch (err) {
        console.error("❌ Listing buckets failed:");
        console.error(err);
    }
}
listBuckets();
