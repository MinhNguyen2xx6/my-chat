import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Friendship from '../models/Friendship.js';
import Conversation from '../models/Conversation.js';
import { setIO, emitToUser, markOnline, markOffline, isOnline } from './io.js';

const OFFLINE_GRACE_MS = 3000; // tranh nhap nhay khi app chuyen nen / mat mang chop nhoang

const getFriendIds = async (userId) => {
    const docs = await Friendship.find({
        status: 'accepted',
        $or: [{ requester: userId }, { recipient: userId }],
    })
        .select('requester recipient')
        .lean();
    return docs.map((d) =>
        String(d.requester) === String(userId) ? d.recipient : d.requester
    );
};

const broadcastPresence = async (userId, online, lastSeenAt) => {
    try {
        const friendIds = await getFriendIds(userId);
        friendIds.forEach((fid) =>
            emitToUser(fid, 'presence:update', { userId, online, lastSeenAt })
        );
    } catch (error) {
        console.error('Loi khi broadcast presence', error);
    }
};

export const initSocket = (httpServer) => {
    const io = new Server(httpServer, { cors: { origin: '*' } });
    setIO(io);

    // Xac thuc bang access token ngay luc ket noi
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('unauthorized'));
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) return next(new Error('unauthorized'));
            socket.userId = String(decoded.userId);
            next();
        });
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;
        socket.join(`user:${userId}`);

        if (markOnline(userId, socket.id)) {
            broadcastPresence(userId, true, null);
        }

        // Dang nhap: { conversationId, isTyping }
        socket.on('typing', async (payload) => {
            try {
                const { conversationId, isTyping } = payload || {};
                if (!mongoose.isValidObjectId(conversationId)) return;

                const conv = await Conversation.findOne({
                    _id: conversationId,
                    participants: userId,
                })
                    .select('participants')
                    .lean();
                if (!conv) return;

                const other = conv.participants.find((p) => String(p) !== userId);
                if (other) {
                    emitToUser(other, 'typing', {
                        conversationId,
                        userId,
                        isTyping: !!isTyping,
                    });
                }
            } catch (error) {
                console.error('Loi su kien typing', error);
            }
        });

        socket.on('disconnect', () => {
            if (!markOffline(userId, socket.id)) return;

            setTimeout(async () => {
                if (isOnline(userId)) return; // da ket noi lai
                const lastSeenAt = new Date();
                try {
                    await User.updateOne({ _id: userId }, { lastSeenAt });
                } catch (error) {
                    console.error('Loi khi luu lastSeenAt', error);
                }
                broadcastPresence(userId, false, lastSeenAt);
            }, OFFLINE_GRACE_MS);
        });
    });

    return io;
};
