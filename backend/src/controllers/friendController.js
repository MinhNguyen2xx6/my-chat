import mongoose from 'mongoose';
import User from '../models/User.js';
import Friendship from '../models/Friendship.js';

const USER_FIELDS = 'displayName username avatarUrl';

// POST /api/friends/requests  { userId }
export const sendRequest = async (req, res) => {
    try {
        const me = req.user._id;
        const { userId } = req.body;

        if (!userId || !mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ message: 'userId không hợp lệ' });
        }
        if (String(me) === String(userId)) {
            return res.status(400).json({ message: 'Không thể kết bạn với chính mình' });
        }

        const target = await User.findById(userId).select('_id');
        if (!target) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        const existing = await Friendship.findOne({
            $or: [
                { requester: me, recipient: userId },
                { requester: userId, recipient: me },
            ],
        });

        if (existing) {
            if (existing.status === 'accepted') {
                return res.status(409).json({ message: 'Hai bạn đã là bạn bè' });
            }
            if (String(existing.requester) === String(me)) {
                return res.status(409).json({ message: 'Bạn đã gửi lời mời cho người này' });
            }
            // Doi phuong da gui loi moi cho minh truoc -> chap nhan luon
            existing.status = 'accepted';
            await existing.save();
            return res.status(200).json({ message: 'Hai bạn đã trở thành bạn bè', status: 'friend' });
        }

        await Friendship.create({ requester: me, recipient: userId });
        return res.status(201).json({ message: 'Đã gửi lời mời kết bạn', status: 'sent' });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Lời mời đã tồn tại' });
        }
        console.error('Loi khi goi sendRequest', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

// GET /api/friends/requests  -> loi moi minh da nhan
export const getRequests = async (req, res) => {
    try {
        const docs = await Friendship.find({ recipient: req.user._id, status: 'pending' })
            .sort({ createdAt: -1 })
            .populate('requester', USER_FIELDS);

        const requests = docs
            .filter((d) => d.requester)
            .map((d) => ({ _id: d._id, user: d.requester, createdAt: d.createdAt }));

        return res.status(200).json({ requests });
    } catch (error) {
        console.error('Loi khi goi getRequests', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

// POST /api/friends/requests/:id/accept
export const acceptRequest = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'id không hợp lệ' });
        }

        const doc = await Friendship.findOneAndUpdate(
            { _id: id, recipient: req.user._id, status: 'pending' },
            { status: 'accepted' },
            { new: true }
        );
        if (!doc) {
            return res.status(404).json({ message: 'Không tìm thấy lời mời' });
        }
        return res.status(200).json({ message: 'Đã chấp nhận lời mời' });
    } catch (error) {
        console.error('Loi khi goi acceptRequest', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

// POST /api/friends/requests/:id/decline
export const declineRequest = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'id không hợp lệ' });
        }

        const doc = await Friendship.findOneAndDelete({
            _id: id,
            recipient: req.user._id,
            status: 'pending',
        });
        if (!doc) {
            return res.status(404).json({ message: 'Không tìm thấy lời mời' });
        }
        return res.status(200).json({ message: 'Đã từ chối lời mời' });
    } catch (error) {
        console.error('Loi khi goi declineRequest', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

// GET /api/friends
export const getFriends = async (req, res) => {
    try {
        const me = req.user._id;
        const docs = await Friendship.find({
            status: 'accepted',
            $or: [{ requester: me }, { recipient: me }],
        })
            .populate('requester', USER_FIELDS)
            .populate('recipient', USER_FIELDS);

        const friends = docs
            .map((d) => {
                if (!d.requester || !d.recipient) return null; // user da bi xoa
                const other = String(d.requester._id) === String(me) ? d.recipient : d.requester;
                return { friendshipId: d._id, user: other };
            })
            .filter(Boolean)
            .sort((a, b) => a.user.displayName.localeCompare(b.user.displayName));

        return res.status(200).json({ friends });
    } catch (error) {
        console.error('Loi khi goi getFriends', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};

// DELETE /api/friends/:id   (id = friendshipId)
export const removeFriend = async (req, res) => {
    try {
        const { id } = req.params;
        const me = req.user._id;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'id không hợp lệ' });
        }

        const doc = await Friendship.findOneAndDelete({
            _id: id,
            status: 'accepted',
            $or: [{ requester: me }, { recipient: me }],
        });
        if (!doc) {
            return res.status(404).json({ message: 'Không tìm thấy quan hệ bạn bè' });
        }
        return res.status(200).json({ message: 'Đã hủy kết bạn' });
    } catch (error) {
        console.error('Loi khi goi removeFriend', error);
        return res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};
