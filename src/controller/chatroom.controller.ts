import mongoose from "mongoose";
import asyncWrapper from "../middlewares/AsyncWrapper";
import chatroomModel from "../model/chatroom.model";
import { ValidateToken } from "../utils/password.utils";

export const getUserChatRooms = asyncWrapper(async (req, res) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" });

    const { userId, type } = req.body;
    if (!userId || !type) return res.status(400).json({ errors: "Invalid request" });

    // Fetch the chatrooms and populate user details for the members
    const chatrooms = await chatroomModel.aggregate([
        {
            $match: {
                type: 'dm',
                members: { $in: [new mongoose.Types.ObjectId(userId)] }
            }
        },
        {
            $lookup: {
                from: 'users', // Assuming your users collection is named 'users'
                localField: 'members',
                foreignField: '_id',
                as: 'memberDetails'
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                type: 1,
                members: 1,
                memberDetails: {
                    _id: 1,
                    profileID: 1,
                    title: 1,
                    email: 1,
                    firstName: 1,
                    lastName: 1,
                    profile_pic: 1
                }
            }
        }
    ]);

    res.status(200).json({ status: true, chatrooms });
});



export const createDMChatroom = asyncWrapper(async (req, res) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" });

    const { type, members, name } = req.body
    if (!type || members?.length < 2 || !name) return res.status(400).json({ errors: "Invalid request" })

    // check if dm exists
    const existingDM = await chatroomModel.findOne({
        type: 'dm',
        members: { $all: members }
    });


    if (existingDM) {
        return res.status(200).json({ status: true, chatroom: await existingDM.populate('members') });
    }
    const newChatroom = await chatroomModel.create({
        name,
        type,
        members
    });

    if (!newChatroom) {
        return res.status(500).json({ errors: "Unable to create chat" });
    }

    await newChatroom.populate('members');

    res.status(200).json({
        status: true,
        chatroom: newChatroom
    });

})

export const useGetSingleChatroom = asyncWrapper(async (req, res) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" });

    const { chatroomId } = req.params;

    const chatroom = await chatroomModel.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(chatroomId)
            }
        },
        {
            $lookup: {
                from: 'users', // Assuming your users collection is named 'users'
                localField: 'members',
                foreignField: '_id',
                as: 'memberDetails'
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                type: 1,
                members: 1,
                memberDetails: {
                    _id: 1,
                    profileID: 1,
                    title: 1,
                    email: 1,
                    firstName: 1,
                    lastName: 1,
                    profile_pic: 1
                }
            }
        }
    ]);

    // Since aggregate returns an array, return the first item
    if (!chatroom || chatroom.length === 0) {
        return res.status(404).json({ errors: "Chat not found" });
    }

    res.status(200).json({
        status: true,
        chatroom: chatroom[0] // Return only the first (and only) chatroom
    });
});
