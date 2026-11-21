import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';

// backend/uploads (khong phu thuoc thu muc dang chay lenh)
export const uploadsDir = fileURLToPath(new URL('../../uploads', import.meta.url));
fs.mkdirSync(uploadsDir, { recursive: true });

const EXT = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    // Ten file ngau nhien, khong dung ten goc cua nguoi dung
    filename: (req, file, cb) =>
        cb(null, crypto.randomBytes(16).toString('hex') + EXT[file.mimetype]),
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5MB
    fileFilter: (req, file, cb) =>
        EXT[file.mimetype] ? cb(null, true) : cb(new Error('INVALID_TYPE')),
});

export const uploadImage = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (!err) return next();
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'Ảnh quá lớn (tối đa 5MB)' });
        }
        if (err.message === 'INVALID_TYPE') {
            return res.status(400).json({ message: 'Chỉ hỗ trợ ảnh JPG, PNG, WEBP, GIF' });
        }
        console.error('Loi upload anh', err);
        return res.status(500).json({ message: 'Lỗi khi tải ảnh lên' });
    });
};
