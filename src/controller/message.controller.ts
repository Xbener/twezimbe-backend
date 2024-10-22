import { Request, Response } from 'express';
import Message from '../model/messages.model';
import { ValidateToken } from '../utils/password.utils';
import mongoose from 'mongoose';
import asyncWrapper from '../middlewares/AsyncWrapper';

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

// Controller to create a new message in a chatroom
export const createMessage = async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);

    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })
    const { sender_id, chatroom, content, messageType, attachmentUrl, receiver_id, replyingTo } = req.body;
    try {
        const newMessage = await Message.create({
            sender_id,
            chatroom,
            content,
            messageType,
            attachmentUrl: attachmentUrl!,
            receiver_id,
            replyingTo
        });

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
    const isEmojiThere = await Message.findOne({
        _id: new mongoose.Types.ObjectId(messageId),
        reactions: {
            $elemMatch: {
                user_id: new mongoose.Types.ObjectId(userId),
                emoji: emoji
            }
        }
    });
    if (isEmojiThere) {
        return res.status(409).json({ errors: "Already reacted" });
    }

    // Add the new reaction
    const message = await Message.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(messageId) },
        { $push: { reactions: { user_id: userId, emoji } } },
        { new: true }  // Return the updated document
    );

    if (!message) {
        return res.status(404).json({ errors: "Unable to find message" });
    }

    res.status(200).json({
        status: true,
        message: "Reaction added successfully"
    });
});
