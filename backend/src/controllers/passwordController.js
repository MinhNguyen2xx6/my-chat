import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { sendEmail } from '../libs/sendEmail.js';

const OTP_TTL = 10 * 60 * 1000; // 10 phut
const MAX_ATTEMPTS = 5;

// HMAC de DB khong luu OTP thuan (dung secret san co trong .env)
const hashOtp = (otp) =>
    crypto.createHmac('sha256', process.env.ACCESS_TOKEN_SECRET).update(otp).digest('hex');

// POST /api/auth/forgot-password  { email }
export const forgotPassword = async (req, res) => {
    // Luon tra cung 1 message de khong lo email nao co trong he thong
    const genericResponse = {
        message: 'Neu email ton tai, chung toi da gui ma xac nhan.',
    };

    try {
        let { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Vui long nhap email' });
        }

        email = email.trim().toLowerCase();
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(200).json(genericResponse);
        }

        const otp = crypto.randomInt(100000, 1000000).toString(); // 6 so
        user.resetOtp = hashOtp(otp);
        user.resetOtpExpires = new Date(Date.now() + OTP_TTL);
        user.resetOtpAttempts = 0;
        await user.save();

        try {
            await sendEmail({
                to: user.email,
                subject: 'Ma xac nhan dat lai mat khau - My Chat App',
                html: `
                    <p>Xin chao ${user.displayName},</p>
                    <p>Ma xac nhan dat lai mat khau cua ban la:</p>
                    <p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#FF7A45;">${otp}</p>
                    <p>Ma co hieu luc trong 10 phut. Neu ban khong yeu cau, hay bo qua email nay.</p>
                `,
            });
        } catch (mailError) {
            user.resetOtp = undefined;
            user.resetOtpExpires = undefined;
            await user.save();
            console.error('Loi khi gui mail OTP', mailError);
            return res.status(500).json({ message: 'Khong the gui email, thu lai sau' });
        }

        return res.status(200).json(genericResponse);
    } catch (error) {
        console.error('Loi khi goi forgotPassword', error);
        return res.status(500).json({ message: 'Loi he thong khi quen mat khau' });
    }
};

// POST /api/auth/reset-password  { email, otp, password }
export const resetPassword = async (req, res) => {
    const invalid = { message: 'Ma xac nhan khong dung hoac da het han' };

    try {
        let { email, otp, password } = req.body;

        if (!email || !otp || !password) {
            return res.status(400).json({ message: 'Vui long nhap day du email, ma xac nhan va mat khau moi' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Mat khau phai co it nhat 6 ky tu' });
        }

        email = email.trim().toLowerCase();
        const user = await User.findOne({ email }).select(
            '+resetOtp +resetOtpExpires +resetOtpAttempts'
        );

        if (!user || !user.resetOtp || !user.resetOtpExpires || user.resetOtpExpires < new Date()) {
            return res.status(400).json(invalid);
        }

        if (user.resetOtpAttempts >= MAX_ATTEMPTS) {
            return res.status(429).json({ message: 'Nhap sai qua nhieu lan, vui long yeu cau ma moi' });
        }

        const a = Buffer.from(hashOtp(String(otp).trim()));
        const b = Buffer.from(user.resetOtp);
        const match = a.length === b.length && crypto.timingSafeEqual(a, b);

        if (!match) {
            user.resetOtpAttempts += 1;
            await user.save();
            return res.status(400).json(invalid);
        }

        user.hashedPassword = await bcrypt.hash(password, 10);
        user.resetOtp = undefined;
        user.resetOtpExpires = undefined;
        user.resetOtpAttempts = 0;
        await user.save();

        // Dang xuat moi thiet bi
        await Session.deleteMany({ userId: user._id });

        return res.status(200).json({ message: 'Dat lai mat khau thanh cong, hay dang nhap lai' });
    } catch (error) {
        console.error('Loi khi goi resetPassword', error);
        return res.status(500).json({ message: 'Loi he thong khi dat lai mat khau' });
    }
};