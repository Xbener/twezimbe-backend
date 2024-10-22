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
                type: type,
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
