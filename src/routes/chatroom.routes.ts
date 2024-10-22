import { Router } from "express";
import { getUserChatRooms } from "../controller/chatroom.controller";

const router = Router()

router.post('/user', getUserChatRooms)

export default router