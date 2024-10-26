import { Router } from "express";
import { getChannelSettings, updatedChannelSettings } from "../controller/settings.controller";

const router = Router()

router.put('/channel/:settingsId', updatedChannelSettings)
router.get('/channel/:channelId', getChannelSettings)

export default router