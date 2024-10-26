import { Request, Response } from 'express';
import Message from '../model/messages.model';
import { ValidateToken } from '../utils/password.utils';
import mongoose from 'mongoose';
import asyncWrapper from '../middlewares/AsyncWrapper';
import readreceiptsModel from '../model/readreceipts.model';
import Group, { GroupDoc } from '../model/group.model'
import channelModel from '../model/channel.model';
import { v2 as cloudinary } from 'cloudinary'

// Controller to get all messages for a specific chatroom
export const getMessagesForChatroom = async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);

    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })
    const { chatroomId } = req.params;
    console.log(chatroomId)
    try {
        const messages = await Message.aggregate([
            { $match: { chatroom: new mongoose.Types.ObjectId(chatroomId) } },
            {
                $lookup: {
                    from: 'users', // Assuming your user collection is named 'users'
                    localField: 'sender_id',
                    foreignField: '_id',
                    as: 'sender',
                },
            },
            {
                $lookup: {
                    from: 'messages', // Assuming your user collection is named 'users'
                    localField: 'replyingTo',
                    foreignField: '_id',
                    as: 'replyingTo',
                },
            },
            {
                $lookup: {
                    from: 'chatroom', // Assuming your user collection is named 'users'
                    localField: 'chatroom',
                    foreignField: '_id',
                    as: 'chatroom',
                },
            },
            {
                $unwind: {
                    path: "$sender",
                    preserveNullAndEmptyArrays: true,
                }
            },
            {
                $unwind: {
                    path: '$replyingTo',
                    preserveNullAndEmptyArrays: true,
                }
            },
            {
                $unwind: {
                    path: '$chatroom',
                    preserveNullAndEmptyArrays: true,
                }
            },
            { $sort: { createdAt: 1 } },
            {
                $project: {
                    replyingTo: "$replyingTo",
                    _id: "$_id",
                    sender: "$sender",
                    chatroom: "$chatroom",
                    sender_id: "$sender_id",
                    content: "$content",
                    createdAt: "$createdAt",
                    edited: "$edited",
                    attachmentUrls: "$attachmentUrls",
                    updatedAt: "$updatedAt",
                    pinned: "$pinned",
                    reactions: "$reactions"
                }
            }
        ]);

        res.status(200).json({ messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Error fetching messages' });
    }
};


export const uploadMessagePictures = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" });

    const attachmentUrls: { url: string, type: string, name: string }[] = [];

    // Check if req.files is an array of files
    if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
            try {

                // Upload the file to Cloudinary
                const uploadResult = await cloudinary.uploader.upload(file.path, {
                    resource_type: 'auto'  // This enables support for all file types
                });
                attachmentUrls.push({
                    url: uploadResult.secure_url,
                    type: file.mimetype,
                    name: file.originalname
                });
            } catch (error) {
                console.error(`Failed to upload file ${file.originalname}:`, error);
            }
        }
    }

    if (!attachmentUrls.length) {
        return res.status(500).json({ status: false, errors: "Unable to upload any files" });
    }

    // Return the attachment URLs
    return res.status(200).json({ status: true, attachmentUrls });
});


// Controller to create a new message in a chatroom
export const createMessage = async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);

    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })
    const { sender_id, chatroom, content, messageType, attachmentUrls, receiver_id, replyingTo } = req.body;



    try {
        const newMessage = await Message.create({
            sender_id,
            chatroom,
            content,
            messageType,
            attachmentUrls: attachmentUrls!,
            receiver_id,
            replyingTo
        });

        const unreadEntries = receiver_id.map(async (receiver: string) => {
            if (receiver !== sender_id) {
                await readreceiptsModel.create({ messageId: newMessage._id, userId: receiver, chatroom })
            }
        })

        res.status(201).json({ status: true, message: newMessage });
    } catch (error) {
        console.error('Error creating message:', error);
        res.status(500).json({ message: 'Error creating message' });
    }
};


export const editMessage = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })

    const { content } = req.body
    const { messageId } = req.params
    const message = await Message.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(messageId) }, { content, edited: true })
    if (!message) return res.status(500).json({ errors: "unable to edit" })
    res.status(200).json({
        message,
        status: true
    })
})

export const deleteMessage = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })

    const { messageId } = req.params
    const message = await Message.findOneAndDelete({ _id: new mongoose.Types.ObjectId(messageId) })
    if (!message) return res.status(500)
    res.status(200).json({
        status: true
    })
})


export const pinMessage = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })
    const { messageId } = req.body
    const message = await Message.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(messageId) }, { pinned: !req.body.pinned })
    if (!message) return res.status(404).json({ errors: "Message to pin not found" })
    res.status(200).json({
        status: true,
        message: "message pinned successfully"
    })
})


export const addReaction = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" });

    const { messageId, userId, emoji } = req.body;

    if (!messageId || !userId || !emoji) return res.status(400).json({ errors: "Invalid request" });

    // Check if the user has already reacted with this emoji
    const existingReaction = await Message.findOne({
        _id: new mongoose.Types.ObjectId(messageId),
        reactions: {
            $elemMatch: {
                user_id: new mongoose.Types.ObjectId(userId),
                emoji: emoji
            }
        }
    });

    if (existingReaction) {
        // If the reaction exists, remove it (unreact)
        const message = await Message.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(messageId) },
            { $pull: { reactions: { user_id: new mongoose.Types.ObjectId(userId), emoji } } },
            { new: true }  // Return the updated document
        );

        if (!message) {
            return res.status(404).json({ errors: "Unable to find message" });
        }

        return res.status(200).json({
            status: true,
            message: "Reaction removed successfully",
            updatedReactions: message.reactions // Send updated reactions for real-time updates
        });
    } else {
        // If the reaction doesn't exist, add it
        const message = await Message.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(messageId) },
            { $push: { reactions: { user_id: new mongoose.Types.ObjectId(userId), emoji } } },
            { new: true }  // Return the updated document
        );

        if (!message) {
            return res.status(404).json({ errors: "Unable to find message" });
        }

        return res.status(200).json({
            status: true,
            message: "Reaction added successfully",
            updatedReactions: message.reactions // Send updated reactions for real-time updates
        });
    }
});




export const getUnreadMessages = asyncWrapper(async (req, res) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" });

    // Initial unread messages aggregation
    const unreadMessages = await readreceiptsModel.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: 'messages',
                localField: 'messageId',
                foreignField: '_id',
                as: 'message'
            }
        },
        {
            $lookup: {
                from: 'chatrooms',
                localField: 'chatroom',
                foreignField: '_id',
                as: 'chatroom'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'message.sender_id',
                foreignField: '_id',
                as: 'sender'
            }
        },
        {
            $unwind: { path: '$chatroom', preserveNullAndEmptyArrays: true }
        },
        {
            $unwind: { path: '$sender', preserveNullAndEmptyArrays: true }
        }
    ]);

    // Process each unread message, fetching group data if chatroom type is 'channel'
    const processedMessages = await Promise.all(
        unreadMessages.map(async (message) => {
            if (message.chatroom?.type === 'channel' && message.chatroom.ref) {
                // Fetch the Channel document to get the groupId
                const channel = await channelModel.findById(message.chatroom.ref, 'groupId');

                if (channel?.groupId) {
                    // Use groupId from Channel to fetch the Group document
                    const group = await Group.findById(channel.groupId, 'group_picture name');
                    message.contact = group || null;  // Add group info or null if not found
                } else {
                    message.contact = null;
                }
            } else {
                // Use the sender as contact info for direct messages (DMs)
                message.contact = message.sender || null;
            }
            return message;
        })
    );

    return res.status(200).json({
        status: true,
        unreadMessages: processedMessages,
    });
});



export const markAsRead = asyncWrapper(async (req, res) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" });

    const { messageId, userId } = req.body
    if (!userId || !messageId) return res.status(400).json({ errors: "Invalid request" })
    console.log(req.body)
    await readreceiptsModel.updateMany({ messageId: new mongoose.Types.ObjectId(messageId), userId: new mongoose.Types.ObjectId(userId) }, { $set: { isRead: true, readAt: new Date() } }, { new: true })
    res.status(200).json({ message: 'Message marked as read' });
})