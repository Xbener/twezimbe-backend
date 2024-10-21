import { Request, Response } from "express";
import asyncWrapper from "../middlewares/AsyncWrapper";
import Channel from "../model/channel.model";
import { ValidateToken } from "../utils/password.utils";
import UserChannel from '../model/user_channel.model'
import Role from "../model/role.model";
import chatroomModel from "../model/chatroom.model";
import mongoose from "mongoose";
import { UserDoc } from "../model/user.model";


export const addChannel = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })

    const newChannel = await Channel.create({ ...req.body, created_by: req?.user?._id, memberCount: 1 })
    if (newChannel) {
        const newChatRoom = await chatroomModel.create({ name: newChannel.name, ref: newChannel._id })
        const role = await Role.findOne({ role_name: "ChannelAdmin" })
        const memberRole = await Role.findOne({ role_name: "ChannelMember" })

        const newUserChannel = await UserChannel.create({
            channel_id: newChannel._id,
            role_id: role?._id,
            user_id: req?.user?._id
        })

        if (newUserChannel) {
            if(req.body.state.toLowerCase() === "public"){
                req.body.members.forEach(async (member: UserDoc) => {
                    await UserChannel.create({
                        channel_id: newChannel._id,
                        role_id: memberRole?._id,
                        user_id: member._id || member?.userId
                    })
                })
            }
            return res.status(201).json({
                status: true,
                channel: newChannel
            })

        }

        return res.status(500).json({ errors: "unable to create new channel user" })
    }
    return res.status(500).json({ errors: "unable to create new channel 1" })
})


export const getGroupChannels = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })


    const groupChannels = await UserChannel.aggregate([
        {
            $match: {
                user_id: new mongoose.Types.ObjectId(req.params.userId),
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
            $lookup: {
                from: 'users',
                localField: "user_id",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $lookup: {
                from: "channels",
                localField: "channel_id",
                foreignField: "_id",
                as: "channel"
            }
        },
        {
            $unwind: {
                path: "$chatroom",
                preserveNullAndEmptyArrays: true // In case there's no matching chatroom
            }
        },
        {
            $unwind: {
                path: '$channel',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $unwind: {
                path: '$user',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $group: {
                _id: "$channel_id",
                channel: { $first: "$channel" }, // Take the first channel object
                user_id: { $first: "$user_id" }, // Include user_id if needed
                role_id: { $first: "$role_id" }, // Take the first role_id (you can change this logic)
                createdAt: { $first: "$createdAt" }, // Include createdAt if needed
                updatedAt: { $first: "$updatedAt" }  // Include updatedAt if needed
            }
        },
        {
            $project: {
                _id: "$channel._id",
                name: "$channel.name",
                groupId: "$channel.groupId",
                memberCount: "$channel.memberCount",
                description: "$channel.description",
                state: "$channel.state",
                created_by: "$channel.created_by",
                createdAt: "$channel.createdAt",
                updatedAt: "$channel.updatedAt"
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
            $lookup: {
                from: "user_channels",
                localField: "_id",
                foreignField: "channel_id",
                as: "members"
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
                created_by: { $first: "$created_by" },
                chatroom: { $first: "$chatroom" },
                createdAt: { $first: "$createdAt" },
                updatedAt: { $first: "$updatedAt" },
                members: { $first: "$members.user_id" },
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