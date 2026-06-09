const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

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
 * Robust S3 + Local Fallback Uploader using memory storage as buffer
 */
const _uploadS3Intercepter = (folder) => {
    // 1. Memory storage to hold files in buffer (allows single request stream parse)
    const uploader = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
    });

    const processFile = async (file) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const key = `${folder}/${uniqueSuffix}${ext}`;

        try {
            console.log(`📡 Attempting S3 upload for file: ${file.originalname}`);
            const bucketName = process.env.AWS_BUCKET_NAME || "fallback";
            await s3.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype
            }));

            // Construct S3 URL
            let publicUrl = key;
            if (process.env.S3_PUBLIC_URL_PREFIX) {
                publicUrl = `${process.env.S3_PUBLIC_URL_PREFIX}/${key}`;
            } else if (process.env.S3_ENDPOINT) {
                publicUrl = `${process.env.S3_ENDPOINT}/${bucketName}/${key}`;
            } else {
                publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
            }

            file.location = publicUrl;
            file.key = key;
            console.log(`✅ S3 Upload succeeded: ${publicUrl}`);
        } catch (err) {
            console.warn(`⚠️ S3 Upload failed for ${file.originalname}, saving locally: ${err.message}`);

            // Local disk fallback
            const dir = path.join(__dirname, '../uploads', folder);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const localFileName = `${uniqueSuffix}${ext}`;
            const localFilePath = path.join(dir, localFileName);
            
            // Write buffer to local disk
            fs.writeFileSync(localFilePath, file.buffer);

            file.filename = localFileName;
            file.path = `uploads/${folder}/${localFileName}`;
            file.location = `/uploads/${folder}/${localFileName}`;
            console.log(`✅ Local fallback saved: ${file.location}`);
        }
    };

    return {
        array: (fieldName, count) => (req, res, next) => {
            uploader.array(fieldName, count)(req, res, async (err) => {
                if (err) return next(err);
                if (req.files && req.files.length > 0) {
                    try {
                        for (const file of req.files) {
                            await processFile(file);
                        }
                    } catch (syncErr) {
                        return next(syncErr);
                    }
                }
                next();
            });
        },
        single: (fieldName) => (req, res, next) => {
            uploader.single(fieldName)(req, res, async (err) => {
                if (err) return next(err);
                if (req.file) {
                    try {
                        await processFile(req.file);
                    } catch (syncErr) {
                        return next(syncErr);
                    }
                }
                next();
            });
        }
    };
};

const getFileUrl = (key) => {
    if (process.env.S3_PUBLIC_URL_PREFIX) {
        return `${process.env.S3_PUBLIC_URL_PREFIX}/${key}`;
    }
    return key;
};

module.exports = { uploadS3: _uploadS3Intercepter, getFileUrl, s3 };
