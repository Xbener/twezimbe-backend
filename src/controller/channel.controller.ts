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
        const newChatRoom = await chatroomModel.create({ name: newChannel.name, ref: newChannel._id, members: [req?.user?._id] })
        const role = await Role.findOne({ role_name: "ChannelAdmin" })
        const memberRole = await Role.findOne({ role_name: "ChannelMember" })

        const newUserChannel = await UserChannel.create({
            channel_id: newChannel._id,
            role_id: role?._id,
            user_id: req?.user?._id,
            group_id: req.body?.groupId
        })

        console.log(req.body.members)
        if (newUserChannel) {
            if (req.body.state.toLowerCase() === "public") {
                req.body.members.forEach(async (member: UserDoc) => {
                    await UserChannel.create({
                        channel_id: newChannel._id,
                        role_id: memberRole?._id,
                        user_id: member._id || member?.userId,
                        group_id: req?.body?.groupId
                    })

                    const updatedChatRoom = await chatroomModel.findOneAndUpdate(
                        { _id: newChatRoom?._id },
                        { $push: { members: member?.userId } },
                        { new: true } // This option returns the updated document
                    );

                    if (!updatedChatRoom) {
                        console.log("Chatroom not found or update failed.");
                    } else {
                        console.log("Updated chatroom:", updatedChatRoom);
                    }
                })
            }
            return res.status(201).json({
                status: true,
                channel: newChannel,
                chatroom: newChatRoom
            })

        }

        return res.status(500).json({ errors: "unable to create new channel user" })
    }
    return res.status(500).json({ errors: "unable to create new channel 1" })
})

export const getUserChatRooms = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })
    const { userId } = req.body

    const chatrooms = await chatroomModel.find({ members: new mongoose.Types.ObjectId(userId) }).select('_id');
    return res.status(200).json({ status: true, chatrooms: chatrooms.map(room => room?._id) })
})


export const getGroupChannels = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })


    const groupChannels = await UserChannel.aggregate([
        {
            $match: {
                user_id: new mongoose.Types.ObjectId(req.params.userId),
                group_id: new mongoose.Types.ObjectId(req.params.groupId)
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
            $lookup: {
                from: "chatrooms",
                localField: "ref",
                foreignField: "channel._id",
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
                updatedAt: "$channel.updatedAt",
                chatroom: "$chatroom"
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
                groupId: { $first: "$groupId" }
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


export const addMemberToPrivateChannel = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })

    const { channelId } = req.params
    const { userId, groupId } = req.body

    if (!userId) return res.status(400).json({ errors: "user is required" })

    const channel = await Channel.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(channelId) }, { $inc: { memberCount: 1 } })
    if (!channel) return res.status(404).json({ errors: "Channel was not found" })

    const memberRole = await Role.findOne({ role_name: "ChannelMember" })
    // check if is not user yet
    const isMember = await UserChannel.findOne({ user_id: userId, channel_id: channelId, group_id: groupId })
    if (isMember) return res.status(409).json({ errors: "User is already a member" })
    const newUserChannel = UserChannel.create({
        channel_id: channel?._id,
        user_id: userId,
        role_id: memberRole?._id,
        group_id: groupId
    })
    await chatroomModel.findOneAndUpdate({ ref: channel?._id, name: channel.name }, { $push: { members: userId } })

    res.status(200).json({
        status: true,
        message: "User added successfully"
    })
})


export const updateChannel = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })

    let channel = await Channel.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(req.params.channelId) }, { ...req.body })
    if (req.body.state === 'public' && channel?.state === 'private') {
        const userRole = await Role.findOne({ name: "ChannelMember" })
        req.body.members.forEach(async (memberId: string) => {
            const UserChannelExists = await UserChannel.findOne({ channel_id: req.params.channelId, user_id: memberId })
            if (!UserChannelExists) {
                await UserChannel.create({
                    channel_id: req.params.channelId,
                    userId: memberId,
                    role_id: userRole?._id,
                    group_id: channel?.groupId
                })
                await chatroomModel.findOneAndUpdate({ ref: channel?._id, name: channel?.name }, { $push: { members: memberId } })
            }
        })
    }
    if (!channel) return res.status(404).json({ errors: "channel not found" })
    res.status(200).json({
        status: true
    })
})


export const deleteChannel = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })

    const channel = await Channel.findOneAndDelete({ _id: new mongoose.Types.ObjectId(req.params.channelId) })
    if (!channel) return res.status(404).json({ errors: "Channel not found" })
    res.status(200).json({
        status: true
    })
})