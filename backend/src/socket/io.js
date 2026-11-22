// Giu instance socket.io va danh sach nguoi dang online (trong bo nho)
let io = null;
const online = new Map(); // userId -> Set(socketId)

export const setIO = (instance) => {
    io = instance;
};

export const emitToUser = (userId, event, payload) => {
    io?.to(`user:${userId}`).emit(event, payload);
};

// Tra ve true neu user vua chuyen tu offline sang online
export const markOnline = (userId, socketId) => {
    const key = String(userId);
    let set = online.get(key);
    const wasOffline = !set || set.size === 0;
    if (!set) {
        set = new Set();
        online.set(key, set);
    }
    set.add(socketId);
    return wasOffline;
};

// Tra ve true neu user khong con ket noi nao
export const markOffline = (userId, socketId) => {
    const key = String(userId);
    const set = online.get(key);
    if (!set) return false;
    set.delete(socketId);
    if (set.size === 0) {
        online.delete(key);
        return true;
    }
    return false;
};

export const isOnline = (userId) => online.has(String(userId));
