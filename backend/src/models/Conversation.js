import mongoose from 'mongoose';

const lastMessageSchema = new mongoose.Schema(
    {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        type: { type: String },
        text: { type: String },
        createdAt: { type: Date },
    },
    { _id: false }
);

const conversationSchema = new mongoose.Schema(
    {
        participants: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
            validate: (v) => v.length === 2,
        },
        // "idA_idB" (da sap xep) de moi cap nguoi chi co 1 cuoc tro chuyen
        pairKey: { type: String, required: true, unique: true },
        lastMessage: { type: lastMessageSchema },
    },
    { timestamps: true }
);

conversationSchema.index({ participants: 1, updatedAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
