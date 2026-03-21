const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");

// S3 Configuration (Works for AWS S3 and Cloudflare R2)
const s3 = new S3Client({
    region: process.env.AWS_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT, // Required for Cloudflare R2
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

/**
 * Common configuration for S3 Multer.
 */
const uploadS3 = (folder = "attachments") => multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        acl: "public-read", // Or 'private' based on requirements
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
            cb(null, `${folder}/${uniqueSuffix}${path.extname(file.originalname)}`);
        }
    })
});

/**
 * Retrieve public URL or sign URL for a file.
 * (Simple concatenation if public, otherwise needs GetObjectCommand signed URL)
 */
const getFileUrl = (key) => {
    if (process.env.S3_PUBLIC_URL_PREFIX) {
        return `${process.env.S3_PUBLIC_URL_PREFIX}/${key}`;
    }
    // Fallback or custom logic here
    return key;
};

module.exports = { uploadS3, getFileUrl, s3 };
