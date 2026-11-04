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
}, 
{
    timestamps: true //Tao createdAt va updatedAt tu dong
});

const User = mongoose.model('User', userSchema);
export default User;