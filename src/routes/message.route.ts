import { Router } from "express";
import { addReaction, createMessage, deleteMessage, editMessage, getMessagesForChatroom, getUnreadMessages, pinMessage } from "../controller/message.controller";

const router = Router()
router.put('/add-reaction', addReaction);
router.put('/pin', pinMessage);
router.delete('/:messageId', deleteMessage);
router.get('/:chatroomId', getMessagesForChatroom);
router.post('/:chatroomId', createMessage);
router.put('/:messageId', editMessage);
router.get('/unread', getUnreadMessages)

export default router