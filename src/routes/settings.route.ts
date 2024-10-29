import { Router } from "express";
import { getBfSettings, getChannelSettings, getUserSettings, updateBfSettings, updatedChannelSettings, updatedUserSettings } from "../controller/settings.controller";

const router = Router()

router.put('/channel/:settingsId', updatedChannelSettings)
router.get('/channel/:channelId', getChannelSettings)
router.put('/user/:settingsId', updatedUserSettings)
router.get('/user/:userId', getUserSettings)

router.get('/bf-settings/:bf_id', getBfSettings);
router.put('/bf-settings/:bf_id', updateBfSettings);

export default router