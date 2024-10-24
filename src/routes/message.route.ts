import { Router } from "express";
import { addReaction, createMessage, deleteMessage, editMessage, getMessagesForChatroom, getUnreadMessages, markAsRead, pinMessage } from "../controller/message.controller";

const router = Router()
router.post('/mark-as-read', markAsRead)
router.put('/add-reaction', addReaction);
router.post('/unread', getUnreadMessages)
router.put('/pin', pinMessage);
router.delete('/:messageId', deleteMessage);
router.get('/:chatroomId', getMessagesForChatroom);
router.post('/:chatroomId', createMessage);
router.put('/:messageId', editMessage);

export default router