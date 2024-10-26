import { Router } from "express";
import { addChannel, addMemberToPrivateChannel, deleteChannel, getGroupChannels, getSingleGroupChannel, getUserChatRooms, updateChannel, updateChannelUserRole, } from "../controller/channel.controller";

const channelRouter = Router()

channelRouter.post('/', addChannel)
channelRouter.put('/user-role', updateChannelUserRole)
channelRouter.post('/chatrooms', getUserChatRooms)
channelRouter.put('/:channelId/add-member', addMemberToPrivateChannel)
channelRouter.put('/:channelId', updateChannel)
channelRouter.get('/:groupId/:userId', getGroupChannels)
channelRouter.delete('/:channelId', deleteChannel)
channelRouter.post('/:groupId/:channelId', getSingleGroupChannel)
export default channelRouter;