import express from 'express';
import {
    sendRequest,
    getRequests,
    acceptRequest,
    declineRequest,
    getFriends,
    removeFriend,
} from '../controllers/friendController.js';

const router = express.Router();

router.get('/', getFriends);
router.post('/requests', sendRequest);
router.get('/requests', getRequests);
router.post('/requests/:id/accept', acceptRequest);
router.post('/requests/:id/decline', declineRequest);
router.delete('/:id', removeFriend);

export default router;
