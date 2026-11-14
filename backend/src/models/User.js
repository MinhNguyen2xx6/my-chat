import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    hashedPassword: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    displayName: {
        type: String,
        required: true,
        trim: true
    },
    avatarUrl: {
        type: String //Link CDN de hien thi avt
    },
    avatarId: {
        type: String //Cloudinary public_id de xoa hinh di
    },
    bio: {
        type: String,
        maxLength: 500, // Gioi han do dai bio la 500 ky tu
    },
    phone: {
        type: String,
        sparse: true, //Cho phep null nhung khong duoc trung lap
    },
    //Quen mat khau bang OTP: luu ban hash cua ma + han + so lan nhap sai
    resetOtp: {
        type: String,
        select: false,
    },
    resetOtpExpires: {
        type: Date,
        select: false,
    },
    resetOtpAttempts: {
        type: Number,
        default: 0,
        select: false,
    },
},
{
    timestamps: true //Tao createdAt va updatedAt tu dong
});

const User = mongoose.model('User', userSchema);
export default User;