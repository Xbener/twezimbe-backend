import { Request, Response } from "express";
import asyncWrapper from "../middlewares/AsyncWrapper";
import Channel from "../model/channel.model";
import { ValidateToken } from "../utils/password.utils";
import UserChannel from '../model/user_channel.model'
import Role from "../model/role.model";
import chatroomModel from "../model/chatroom.model";
import mongoose from "mongoose";


export const addChannel = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })

    const newChannel = await Channel.create({ ...req.body, created_by: req?.user?._id, memberCount: 1 })
    if (newChannel) {
        const newChatRoom = await chatroomModel.create({ name: newChannel.name, ref: newChannel._id })
        const role = await Role.findOne({ role_name: "ChannelAdmin" })

        const newUserChannel = await UserChannel.create({
            channel_id: newChannel._id,
            role_id: role?._id,
            user_id: req?.user?._id
        })

        if (newUserChannel) {
            return res.status(201).json({
                status: true,
                channel: newChannel
            })
        }

        return res.status(500).json({ errors: "unable to create new channel user" })
    }
    return res.status(500).json({ errors: "unable to create new channel" })
})


export const getGroupChannels = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })

    const groupChannels = await Channel.aggregate([
        {
            $match: {
                groupId: new mongoose.Types.ObjectId(req.params.groupId),
            }
        },

        {
            $lookup: {
                from: "chatrooms",
                localField: "_id",
                foreignField: "ref",
                as: "chatroom"
            }
        },
        {
            $unwind: {
                path: "$chatroom",
                preserveNullAndEmptyArrays: true // In case there's no matching chatroom
            }
        }
    ]);


    res.status(200).json({
        status: true,
        channels: groupChannels
    })
})

export const getSingleGroupChannel = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })

    let channel = await Channel.aggregate([
        {
            $match: {
                groupId: new mongoose.Types.ObjectId(req.params.groupId),
                _id: new mongoose.Types.ObjectId(req.params.channelId)
            }
        },
        {
            $lookup: {
                from: "chatrooms",
                localField: "_id",
                foreignField: "ref",
                as: "chatroom"
            }
        },
        {
            $unwind: {
                path: "$chatroom",
                preserveNullAndEmptyArrays: true // In case there's no matching chatroom
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "created_by",
                foreignField: "_id",
                as: "created_by"
            }
        },
        {
            $unwind: {
                path: "$created_by",
                preserveNullAndEmptyArrays: true // In case there's no matching user
            }
        },
        {
            $group: {
                _id: "$_id", // _id is required in the $group stage
                name: { $first: "$name" },
                description: { $first: "$description" },
                state: { $first: "$state" },
                createdBy: { $first: "$created_by" },
                chatroom: { $first: "$chatroom" },
                createdAt: { $first: "$createdAt" },
                updatedAt: { $first: "$updatedAt" }
            }
        },
        { $limit: 1 }
    ]);
    if (!channel) return res.status(404).json({ errors: "Channel not found" })
    channel = channel.length > 0 ? channel[0] : null;

    res.status(200).json({
        status: true,
        channel
    })
})