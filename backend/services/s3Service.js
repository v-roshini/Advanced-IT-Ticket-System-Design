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

const fs = require('fs');

/**
 * Robust S3 + Local Fallback Uploader
 */
const _uploadS3Intercepter = (folder) => {
    // 1. Prepare Local Storage
    const diskStorage = multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(__dirname, '../uploads', folder);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, `${uniqueSuffix}${ext}`);
        }
    });

    // 2. Prepare S3 Storage
    const s3Storage = multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME || "fallback",
        metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
        key: (req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, `${folder}/${uniqueSuffix}${ext}`);
        }
    });

    const uploadLocal = multer({ storage: diskStorage });
    const uploadS3 = multer({ storage: s3Storage });

    const handleFiles = (req, files) => {
        if (!files) return;
        const list = Array.isArray(files) ? files : [files];
        list.forEach(f => {
            if (!f.location) {
                // If S3 didn't set a location, it's local
                f.location = `/uploads/${folder}/${f.filename}`;
            }
        });
    };

    return {
        array: (fieldName, count) => (req, res, next) => {
            // Try S3 first
            uploadS3.array(fieldName, count)(req, res, (err) => {
                if (err) {
                    console.warn(`⚠️ S3 Upload failed, falling back to local storage: ${err.message}`);
                    return uploadLocal.array(fieldName, count)(req, res, (localErr) => {
                        if (localErr) return next(localErr);
                        handleFiles(req, req.files);
                        next();
                    });
                }
                next();
            });
        },
        single: (fieldName) => (req, res, next) => {
            // Try S3 first
            uploadS3.single(fieldName)(req, res, (err) => {
                if (err) {
                    console.warn(`⚠️ S3 Upload failed, falling back to local storage: ${err.message}`);
                    return uploadLocal.single(fieldName)(req, res, (localErr) => {
                        if (localErr) return next(localErr);
                        handleFiles(req, req.file);
                        next();
                    });
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
