import nodemailer from 'nodemailer';

// Tao transporter luc gui mail (khong tao luc import),
// vi dotenv.config() trong server.js chay SAU cac dong import
const createTransporter = () =>
    nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: (process.env.EMAIL_PASS || '').replace(/\s+/g, ''), // bo dau cach neu co
        },
    });

export const sendEmail = async ({ to, subject, html }) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Thieu EMAIL_USER hoac EMAIL_PASS trong .env');
    }

    await createTransporter().sendMail({
        from: `"My Chat App" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
    });
};