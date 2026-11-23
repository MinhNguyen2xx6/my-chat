import express from "express";
import {
    authMe,
    searchUsers,
    getMyQrCode,
    findUserByQr,
    scanQrFromImage,
} from "../controllers/userController.js";
import { uploadImage } from "../middlewares/upload.js";

const router = express.Router();

router.get("/me", authMe);
router.get("/me/qr", getMyQrCode);
router.get("/by-qr", findUserByQr);
router.post("/scan-qr-image", uploadImage, scanQrFromImage);
router.get("/search", searchUsers);

export default router;