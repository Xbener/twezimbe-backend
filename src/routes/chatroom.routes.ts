import { Router } from "express";
import { createDMChatroom, getUserChatRooms, useGetSingleChatroom } from "../controller/chatroom.controller";

const router = Router()

router.post('/user', getUserChatRooms)
router.post('/', createDMChatroom)
router.post('/:chatroomId', useGetSingleChatroom)

export default router