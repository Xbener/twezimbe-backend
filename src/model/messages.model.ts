import { Schema, model } from 'mongoose';

const MessageSchema = new Schema({
    sender_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver_id: { type: Schema.Types.ObjectId, ref: 'User' },
    chatroom: { type: Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
    content: { type: String, required: true },
    messageType: { type: String, enum: ['text', 'image', 'video', 'sticker', 'gif'], default: 'text' },
    attachmentUrl: { type: String },
    read: { type: Boolean, default: false },
    status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
    reactions: [
        {
            user_id: { type: Schema.Types.ObjectId, ref: 'User' },
            type: { type: String, enum: ['like', 'love', 'laugh', 'sad', 'angry'] },
        },
    ],
    replyingTo: { type: Schema.Types.ObjectId, ref: 'Message' },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },

}, {
    timestamps: true,
});

export default model('Message', MessageSchema);
