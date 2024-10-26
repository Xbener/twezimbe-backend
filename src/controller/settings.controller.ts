import asyncWrapper from '../middlewares/AsyncWrapper'
import ChannelSettings from '../model/channel_settings.model'
import UserSettings from '../model/user_settings.model';
import { ValidateToken } from '../utils/password.utils';

export const updatedChannelSettings = asyncWrapper(async (req, res) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" });

    const channelSettings = await ChannelSettings.findByIdAndUpdate(req.params.settingsId, req.body, { new: true });
    if (!channelSettings) return res.status(404).json({ errors: "Channel settings not found" });

    return res.status(201).json({
        status: true,
        message: 'channel settings updated successfully'
    })
})

export const getChannelSettings = asyncWrapper(async (req, res) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" });

    const channelSettings = await ChannelSettings.findOne({ ref: req.params.channelId })
    res.status(200).json({
        status: true,
        channelSettings
    })
})


export const updatedUserSettings = asyncWrapper(async (req, res) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" });

    const updatedUserSettings = await UserSettings.findByIdAndUpdate(req.params.settingsId, req.body, { new: true })
    if (!updatedUserSettings) return res.status(404).json({ errors: "Channel settings not found" });

    res.status(201).json({
        status: true
    })
})

export const getUserSettings = asyncWrapper(async (req, res) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" });

    const userSettings = await UserSettings.findOne({ userId: req.params.userId })

    res.status(200).json({
        status: true,
        userSettings
    })
})