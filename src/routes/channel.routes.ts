import { Router } from "express";
import { addChannel, addMemberToPrivateChannel, deleteChannel, getGroupChannels, getSingleGroupChannel, getUserChatRooms, updateChannel, } from "../controller/channel.controller";

const channelRouter = Router()

channelRouter.post('/', addChannel)
channelRouter.post('/chatrooms', getUserChatRooms)
channelRouter.put('/:channelId', updateChannel)
channelRouter.delete('/:channelId', deleteChannel)
channelRouter.post('/:groupId/:channelId', getSingleGroupChannel)
channelRouter.get('/:groupId/:userId', getGroupChannels)
channelRouter.put('/:channelId/add-member', addMemberToPrivateChannel)

export default channelRouter;