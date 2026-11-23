import crypto from 'crypto';
import fs from 'fs';
import QRCode from 'qrcode';
import { Jimp } from 'jimp';
import jsQR from 'jsqr';
import User from '../models/User.js';
import Friendship from '../models/Friendship.js';

const generateUniqueQrCode = async () => {
    for (let i = 0; i < 5; i++) {
        const code = `MYCHAT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const exists = await User.exists({ qrCode: code });
        if (!exists) return code;
    }
    return `MYCHAT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
};

// Dam bao ca tai khoan cu lan tai khoan moi deu co qrCode co dinh trong DB
const ensureUserQrCode = async (user) => {
    if (user.qrCode) return user.qrCode;
    const code = await generateUniqueQrCode();
    await User.updateOne({ _id: user._id }, { $set: { qrCode: code } });
    user.qrCode = code;
    return code;
};

export const authMe = async (req, res) => {
    try {
        const user = req.user; // protectedRoute da gan san
        await ensureUserQrCode(user);
        return res.status(200).json({ user });
    } catch (error) {
        console.error("Loi khi goi authMe", error);
        return res.status(500).json({ message: "Loi he thong" });
    }
};

// GET /api/users/me/qr  -> tra ve ma QR (chuoi + anh PNG base64) cho ca tai khoan cu lan moi
export const getMyQrCode = async (req, res) => {
    try {
        const qrCode = await ensureUserQrCode(req.user);
        const qrImage = await QRCode.toDataURL(qrCode, {
            width: 320,
            margin: 2,
            color: {
                dark: '#0F172A',
                light: '#FFFFFF',
            },
        });
        return res.status(200).json({ qrCode, qrImage });
    } catch (error) {
        console.error('Loi khi goi getMyQrCode', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

// Ham dung chung tim nguoi dung theo chuoi QR
const lookupUserByQrCode = async (me, rawInput) => {
    let raw = String(rawInput ?? '').trim();
    if (!raw) {
        return { status: 400, message: 'Vui lòng nhập hoặc quét mã QR' };
    }

    // Ho tro dinh dang link mychat://qr/MYCHAT-XXXX hoac chuoi thuan MYCHAT-XXXX
    raw = raw.replace(/^mychat:\/\/qr\//i, '').trim();
    const upperCode = raw.toUpperCase();
    const lowerUsername = raw.replace(/^@/, '').toLowerCase();

    const target = await User.findOne({
        $or: [{ qrCode: upperCode }, { username: lowerUsername }],
    })
        .select('displayName username avatarUrl qrCode')
        .lean();

    if (!target) {
        return { status: 404, message: 'Không tìm thấy tài khoản với mã QR này' };
    }

    if (String(target._id) === String(me)) {
        return { status: 400, message: 'Đây là mã QR của chính bạn' };
    }

    const f = await Friendship.findOne({
        $or: [
            { requester: me, recipient: target._id },
            { requester: target._id, recipient: me },
        ],
    }).lean();

    let relation = 'none';
    if (f) {
        if (f.status === 'accepted') relation = 'friend';
        else relation = String(f.requester) === String(me) ? 'sent' : 'received';
    }

    return {
        status: 200,
        user: {
            ...target,
            relation,
            friendshipId: f ? f._id : undefined,
        },
    };
};

// GET /api/users/by-qr?code=MYCHAT-XXXXXXXX  -> tim nguoi dung bang ma QR
export const findUserByQr = async (req, res) => {
    try {
        const r = await lookupUserByQrCode(req.user._id, req.query.code);
        if (r.status !== 200) {
            return res.status(r.status).json({ message: r.message });
        }
        return res.status(200).json({ user: r.user });
    } catch (error) {
        console.error('Loi khi goi findUserByQr', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

// POST /api/users/scan-qr-image  (multipart, field "image") -> giai ma QR tu anh tai len
export const scanQrFromImage = async (req, res) => {
    const removeFile = () => {
        if (req.file) fs.unlink(req.file.path, () => {});
    };

    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Chưa chọn ảnh mã QR' });
        }

        const image = await Jimp.read(req.file.path);
        removeFile();

        // Thu giai ma truc tiep, neu anh qua lon thu resize de jsQR doc nhanh va chuan hon
        let decoded = jsQR(
            new Uint8ClampedArray(image.bitmap.data),
            image.bitmap.width,
            image.bitmap.height
        );

        if (!decoded && image.bitmap.width > 800) {
            image.resize({ w: 800 });
            decoded = jsQR(
                new Uint8ClampedArray(image.bitmap.data),
                image.bitmap.width,
                image.bitmap.height
            );
        }

        if (!decoded?.data) {
            return res
                .status(400)
                .json({ message: 'Không nhận diện được mã QR trong hình ảnh này' });
        }

        const r = await lookupUserByQrCode(req.user._id, decoded.data);
        if (r.status !== 200) {
            return res.status(r.status).json({ message: r.message, qrCode: decoded.data });
        }

        return res.status(200).json({ qrCode: decoded.data, user: r.user });
    } catch (error) {
        removeFile();
        console.error('Loi khi goi scanQrFromImage', error);
        return res
            .status(500)
            .json({ message: 'Không thể đọc hình ảnh này (hỗ trợ PNG, JPG)' });
    }
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/users/search?q=ten
// Tim theo ten hien thi (displayName) hoac username, tra kem trang thai quan he voi minh
export const searchUsers = async (req, res) => {
    try {
        const me = req.user._id;
        const q = String(req.query.q ?? '').trim().slice(0, 50);

        if (!q) {
            return res.status(200).json({ users: [] });
        }

        const regex = escapeRegex(q);
        const users = await User.find({
            _id: { $ne: me },
            $or: [
                { displayName: { $regex: regex, $options: 'i' } },
                { username: { $regex: regex, $options: 'i' } },
            ],
        })
            .select('displayName username avatarUrl qrCode')
            .limit(20)
            .lean();

        const ids = users.map((u) => u._id);
        const relations = await Friendship.find({
            $or: [
                { requester: me, recipient: { $in: ids } },
                { requester: { $in: ids }, recipient: me },
            ],
        }).lean();

        const result = users.map((u) => {
            const f = relations.find(
                (r) => String(r.requester) === String(u._id) || String(r.recipient) === String(u._id)
            );
            let relation = 'none';
            if (f) {
                if (f.status === 'accepted') relation = 'friend';
                else relation = String(f.requester) === String(me) ? 'sent' : 'received';
            }
            return { ...u, relation, friendshipId: f ? f._id : undefined };
        });

        return res.status(200).json({ users: result });
    } catch (error) {
        console.error('Loi khi goi searchUsers', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};
