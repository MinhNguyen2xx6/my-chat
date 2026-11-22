import User from '../models/User.js';
import Friendship from '../models/Friendship.js';

export const authMe = async (req, res) => {
    try {
        const user = req.user; // protectedRoute da gan san
        return res.status(200).json({ user });
    } catch (error) {
        console.error("Loi khi goi authMe", error);
        return res.status(500).json({ message: "Loi he thong" });
    }
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/users/search?q=ten
// Tim theo ten hien thi (displayName), tra kem trang thai quan he voi minh
export const searchUsers = async (req, res) => {
    try {
        const me = req.user._id;
        const q = String(req.query.q ?? '').trim().slice(0, 50);

        if (!q) {
            return res.status(200).json({ users: [] });
        }

        const users = await User.find({
            _id: { $ne: me },
            displayName: { $regex: escapeRegex(q), $options: 'i' },
        })
            .select('displayName username avatarUrl')
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