import { Router } from "express";
import { createMessage, editMessage, getMessagesForChatroom } from "../controller/message.controller";

const router = Router()
router.get('/:chatroomId', getMessagesForChatroom);
router.post('/:chatroomId', createMessage);
router.put('/:messageId', editMessage);

export default router