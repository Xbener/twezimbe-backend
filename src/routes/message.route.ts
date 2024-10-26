import { Router } from "express";
import { addReaction, createMessage, deleteMessage, editMessage, getMessagesForChatroom, getUnreadMessages, markAsRead, pinMessage, uploadMessagePictures } from "../controller/message.controller";
import { upload } from "../utils/multer";

const router = Router()
router.post('/mark-as-read', markAsRead)
router.post('/upload-message-pictures', upload.any(), uploadMessagePictures)
router.put('/add-reaction', addReaction);
router.post('/unread', getUnreadMessages)
router.put('/pin', pinMessage);
router.delete('/:messageId', deleteMessage);
router.get('/:chatroomId', getMessagesForChatroom);
router.post('/:chatroomId', createMessage);
router.put('/:messageId', editMessage);

export default router