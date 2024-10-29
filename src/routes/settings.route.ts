import { Router } from "express";
import { getBfSettings, getChannelSettings, getUserSettings, updateBfSettings, updatedChannelSettings, updatedUserSettings } from "../controller/settings.controller";

const router = Router()


router.get('/bf/:bf_id', getBfSettings);
router.put('/bf/:bf_id', updateBfSettings);
router.put('/channel/:settingsId', updatedChannelSettings)
router.get('/channel/:channelId', getChannelSettings)
router.put('/user/:settingsId', updatedUserSettings)
router.get('/user/:userId', getUserSettings)



export default router