import { Request, Response } from 'express';
import asyncWrapper from '../middlewares/AsyncWrapper'
import ChannelSettings from '../model/channel_settings.model'
import UserSettings from '../model/user_settings.model';
import BfSettings from '../model/bf_settings.model'
import { ValidateToken } from '../utils/password.utils';
import mongoose from 'mongoose';

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
        status: true,
        userSettings: updatedUserSettings
    })
})

export const getUserSettings = asyncWrapper(async (req, res) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" });

    const userSettings = await UserSettings.findOne({ userId: req.user?._id || req.params.userId })

    res.status(200).json({
        status: true,
        userSettings
    })
})


export const getBfSettings = asyncWrapper(async (req: Request, res: Response) => {
    try {
        const { bf_id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(bf_id)) {
            return res.status(400).json({ message: 'Invalid bf_id' });
        }

        const bfSettings = await BfSettings.findOne({ bf_id });

        if (!bfSettings) {
            return res.status(404).json({ message: 'Bf settings not found' });
        }

        res.status(200).json({
            status: true,
            settings: bfSettings
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve Bf settings', error });
    }
})


export const updateBfSettings = asyncWrapper(async (req: Request, res: Response) => {
    try {
        const { bf_id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(bf_id)) {
            return res.status(400).json({ message: 'Invalid bf_id' });
        }

        const updatedBfSettings = await BfSettings.findOneAndUpdate(
            { bf_id },
            req.body,
            { new: true, runValidators: true }
        );

        if (!updatedBfSettings) {
            return res.status(404).json({ message: 'Bf settings not found' });
        }

        res.status(200).json({
            status: true,
            settings: updatedBfSettings
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update Bf settings', error });
    }
})