export const authMe = async (req, res) => {
    try {
        const user = req.user; // protectedRoute da gan san
        return res.status(200).json({ user });
    } catch (error) {
        console.error("Loi khi goi authMe", error);
        return res.status(500).json({ message: "Loi he thong" });
    }
};
