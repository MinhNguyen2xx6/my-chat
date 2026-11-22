import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
    {
        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: { type: String, enum: ['text', 'image'], default: 'text' },
        text: { type: String, maxlength: 2000 },
        imageUrl: { type: String }, // duong dan tuong doi, vd /uploads/abc.jpg
    },
    { timestamps: true }
);

messageSchema.index({ conversation: 1, _id: -1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
