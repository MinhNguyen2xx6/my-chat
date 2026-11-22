import express from 'express';
import {
    openConversation,
    listConversations,
    getConversation,
    deleteConversation,
    clearMessages,
    getMessages,
    sendText,
    sendImage,
} from '../controllers/conversationController.js';
import { uploadImage } from '../middlewares/upload.js';

const router = express.Router();

router.get('/', listConversations);
router.post('/', openConversation);
router.get('/:id', getConversation);
router.delete('/:id', deleteConversation);
router.delete('/:id/messages', clearMessages);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendText);
router.post('/:id/messages/image', uploadImage, sendImage);

export default router;

