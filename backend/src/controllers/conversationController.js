import mongoose from 'mongoose';
import fs from 'fs';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Friendship from '../models/Friendship.js';
import { emitToUser, isOnline } from '../socket/io.js';

const USER_FIELDS = 'displayName username avatarUrl lastSeenAt';

const makePairKey = (a, b) => [String(a), String(b)].sort().join('_');

const areFriends = async (a, b) =>
    !!(await Friendship.exists({
        status: 'accepted',
        $or: [
            { requester: a, recipient: b },
            { requester: b, recipient: a },
        ],
    }));

const formatParticipant = (u) => ({
    _id: u._id,
    displayName: u.displayName,
    username: u.username,
    avatarUrl: u.avatarUrl,
    online: isOnline(u._id),
    lastSeenAt: u.lastSeenAt ?? null,
});

const toPlain = (doc) => JSON.parse(JSON.stringify(doc));

// POST /api/conversations  { userId }  -> mo hoac tao cuoc tro chuyen voi 1 nguoi ban
export const openConversation = async (req, res) => {
    try {
        const me = req.user._id;
        const { userId } = req.body;

        if (!userId || !mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ message: 'userId không hợp lệ' });
        }
        if (String(me) === String(userId)) {
            return res.status(400).json({ message: 'Không thể nhắn tin cho chính mình' });
        }
        if (!(await areFriends(me, userId))) {
            return res.status(403).json({ message: 'Chỉ có thể nhắn tin với bạn bè' });
        }

        const pairKey = makePairKey(me, userId);
        let conv = await Conversation.findOne({ pairKey });
        if (!conv) {
            try {
                conv = await Conversation.create({ participants: [me, userId], pairKey });
            } catch (error) {
                if (error.code !== 11000) throw error;
                conv = await Conversation.findOne({ pairKey });
            }
        }

        await conv.populate('participants', USER_FIELDS);
        const other = conv.participants.find((p) => String(p._id) !== String(me));

        return res.status(200).json({
            conversation: { _id: conv._id, participant: formatParticipant(other) },
        });
    } catch (error) {
        console.error('Loi khi goi openConversation', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

// GET /api/conversations  -> chi lay cuoc tro chuyen da co tin nhan
export const listConversations = async (req, res) => {
    try {
        const me = req.user._id;
        const convs = await Conversation.find({
            participants: me,
            'lastMessage.createdAt': { $exists: true },
        })
            .sort({ updatedAt: -1 })
            .limit(100)
            .populate('participants', USER_FIELDS);

        const conversations = convs
            .map((c) => {
                const other = c.participants.find((p) => p && String(p._id) !== String(me));
                if (!other) return null;
                return {
                    _id: c._id,
                    participant: formatParticipant(other),
                    lastMessage: c.lastMessage,
                    updatedAt: c.updatedAt,
                };
            })
            .filter(Boolean);

        return res.status(200).json({ conversations });
    } catch (error) {
        console.error('Loi khi goi listConversations', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

// GET /api/conversations/:id/messages?before=<messageId>&limit=30  (moi nhat truoc)
export const getMessages = async (req, res) => {
    try {
        const me = req.user._id;
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'id không hợp lệ' });
        }

        const conv = await Conversation.findOne({ _id: id, participants: me }).select('_id');
        if (!conv) {
            return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
        }

        const limit = Math.min(parseInt(req.query.limit, 10) || 30, 50);
        const filter = { conversation: id };
        const { before } = req.query;
        if (before && mongoose.isValidObjectId(before)) {
            filter._id = { $lt: before };
        }

        const docs = await Message.find(filter)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .lean();

        return res.status(200).json({
            messages: docs.slice(0, limit),
            hasMore: docs.length > limit,
        });
    } catch (error) {
        console.error('Loi khi goi getMessages', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

// Kiem tra quyen gui: la thanh vien + van con la ban be
const getSendableConversation = async (id, me) => {
    if (!mongoose.isValidObjectId(id)) {
        return { status: 400, message: 'id không hợp lệ' };
    }
    const conv = await Conversation.findOne({ _id: id, participants: me });
    if (!conv) {
        return { status: 404, message: 'Không tìm thấy cuộc trò chuyện' };
    }
    const other = conv.participants.find((p) => String(p) !== String(me));
    if (!(await areFriends(me, other))) {
        return { status: 403, message: 'Hai bạn không còn là bạn bè' };
    }
    return { conv };
};

const createAndBroadcast = async (conv, senderId, data) => {
    const message = await Message.create({
        conversation: conv._id,
        sender: senderId,
        ...data,
    });

    conv.lastMessage = {
        sender: senderId,
        type: message.type,
        text: message.text,
        createdAt: message.createdAt,
    };
    await conv.save();

    const payload = toPlain(message);
    // Gui cho ca 2 nguoi (nguoi gui de dong bo nhieu thiet bi), client tu loai trung theo _id
    conv.participants.forEach((p) =>
        emitToUser(p, 'message:new', { conversationId: String(conv._id), message: payload })
    );
    return payload;
};

// POST /api/conversations/:id/messages  { text }
export const sendText = async (req, res) => {
    try {
        const text = String(req.body?.text ?? '').trim();
        if (!text) {
            return res.status(400).json({ message: 'Tin nhắn không được để trống' });
        }
        if (text.length > 2000) {
            return res.status(400).json({ message: 'Tin nhắn quá dài (tối đa 2000 ký tự)' });
        }

        const r = await getSendableConversation(req.params.id, req.user._id);
        if (r.status) return res.status(r.status).json({ message: r.message });

        const message = await createAndBroadcast(r.conv, req.user._id, { type: 'text', text });
        return res.status(201).json({ message });
    } catch (error) {
        console.error('Loi khi goi sendText', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

// POST /api/conversations/:id/messages/image  (multipart, field "image")
export const sendImage = async (req, res) => {
    const removeFile = () => {
        if (req.file) fs.unlink(req.file.path, () => {});
    };

    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Chưa chọn ảnh' });
        }

        const r = await getSendableConversation(req.params.id, req.user._id);
        if (r.status) {
            removeFile();
            return res.status(r.status).json({ message: r.message });
        }

        const message = await createAndBroadcast(r.conv, req.user._id, {
            type: 'image',
            imageUrl: `/uploads/${req.file.filename}`,
        });
        return res.status(201).json({ message });
    } catch (error) {
        removeFile();
        console.error('Loi khi goi sendImage', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};
