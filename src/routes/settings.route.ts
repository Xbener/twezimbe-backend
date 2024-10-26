import { Router } from "express";
import { getChannelSettings, getUserSettings, updatedChannelSettings, updatedUserSettings } from "../controller/settings.controller";

const router = Router()

router.put('/channel/:settingsId', updatedChannelSettings)
router.get('/channel/:channelId', getChannelSettings)
router.put('/user/:settingsId', updatedUserSettings)
router.get('/user/:userId', getUserSettings)

export default router