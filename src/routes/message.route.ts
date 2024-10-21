import { Router } from "express";
import { createMessage, deleteMessage, editMessage, getMessagesForChatroom, pinMessage } from "../controller/message.controller";

const router = Router()
router.put('/pin', pinMessage);
router.delete('/:messageId', deleteMessage);
router.get('/:chatroomId', getMessagesForChatroom);
router.post('/:chatroomId', createMessage);
router.put('/:messageId', editMessage);

export default router