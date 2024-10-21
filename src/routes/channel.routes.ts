import { Router } from "express";
import { addChannel, addMemberToPrivateChannel, getGroupChannels, getSingleGroupChannel, } from "../controller/channel.controller";

const channelRouter = Router()

channelRouter.post('/', addChannel)
channelRouter.get('/:userId', getGroupChannels)
channelRouter.get('/:groupId/:channelId', getSingleGroupChannel)
channelRouter.put('/:channelId/add-member', addMemberToPrivateChannel)

export default channelRouter;