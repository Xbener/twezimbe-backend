import { Request, Response } from 'express';
import Message from '../model/messages.model';
import { ValidateToken } from '../utils/password.utils';

// Controller to get all messages for a specific chatroom
export const getMessagesForChatroom = async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);

    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })
    const { chatroomId } = req.params;

    try {
        const messages = await Message.aggregate([
            { $match: { chatroom: chatroomId } },
            {
                $lookup: {
                    from: 'users', // Assuming your user collection is named 'users'
                    localField: 'sender_id',
                    foreignField: '_id',
                    as: 'sender',
                },
            },
            { $unwind: '$sender' },
            {
                $project: {
                    content: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    'sender.username': 1,
                    'sender.profile_pic': 1,
                },
            },
            { $sort: { createdAt: 1 } },
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
    const { sender_id, chatroom, content, messageType, attachmentUrl } = req.body;

    try {
        const newMessage = await Message.create({
            sender_id,
            chatroom,
            content,
            messageType,
            attachmentUrl: attachmentUrl!,
        });

        res.status(201).json({ status: true, message: newMessage });
    } catch (error) {
        console.error('Error creating message:', error);
        res.status(500).json({ message: 'Error creating message' });
    }
};
