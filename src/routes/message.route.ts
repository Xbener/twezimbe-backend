import { Router } from "express";
import { createMessage, getMessagesForChatroom } from "../controller/message.controller";

const router = Router()
router.get('/:chatroomId', getMessagesForChatroom);
router.post('/:chatroomId', createMessage);

export default router