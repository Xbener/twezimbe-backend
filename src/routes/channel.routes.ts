import { Router } from "express";
import { addChannel, getGroupChannels, getSingleGroupChannel, } from "../controller/channel.controller";

const channelRouter = Router()

channelRouter.post('/', addChannel)
channelRouter.get('/:groupId', getGroupChannels)
channelRouter.get('/:groupId/:channelId', getSingleGroupChannel)

export default channelRouter;