import express from "express";
import { authMe, searchUsers } from "../controllers/userController.js";

const router = express.Router();

router.get("/me", authMe);
router.get("/search", searchUsers);

export default router;