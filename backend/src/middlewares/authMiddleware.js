import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectedRoute = (req, res, next) => {
    try {
        //lay token tu header
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1]; // Bearer <token> de xac minh nguoi dung

        if (!token){
            return res.status(401).json({message: "Khong tim thay access token"});
        }
        //xac nhan token hop le
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decodedUser) => {
    
            if (err){
            console.error(err);

            return res.status(403).json({message: "Access token da bi het han hoac khong dung"});
        }
        
        //tim user
        const user = await User.findById(decodedUser.userId).select("-hashedPassword"); 
        if (!user) {
            return res.status(404).json({message: "Thong tin nguoi dung khong ton tai"});
        }

        //tra user ve trong req
        req.user = user;
        next();
    });
    } catch (error) {
        console.error("Loi khi xac minh JWT trong authMiddleware", error);
        return res.status(500).json({message: "Loi he thong"});
    }
};