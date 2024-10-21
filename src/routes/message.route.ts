import { Router } from "express";
import { createMessage, deleteMessage, editMessage, getMessagesForChatroom } from "../controller/message.controller";

const router = Router()
router.delete('/:messageId', deleteMessage);
router.get('/:chatroomId', getMessagesForChatroom);
router.post('/:chatroomId', createMessage);
router.put('/:messageId', editMessage);

export default router