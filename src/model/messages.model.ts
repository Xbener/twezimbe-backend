import { Schema, model } from 'mongoose';

const MessageSchema = new Schema({
    sender_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver_id: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Changed to an array
    chatroom: { type: Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
    content: { type: String, required: false, default: "" },
    messageType: { type: String, enum: ['text', 'image', 'video', 'sticker', 'gif'], default: 'text' },
    attachmentUrls: [{
        type: { type: String, required: true },
        url: { type: String, required: true },
        name:{type:String,required:true}
    }],
    read: { type: Boolean, default: false },
    status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
    reactions: [
        {
            user_id: { type: Schema.Types.ObjectId, ref: 'User' },
            emoji: { type: String, required: true }
        }
    ],
    replyingTo: { type: Schema.Types.ObjectId, ref: 'Message' },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
    pinned: { type: Boolean, required: true, default: false },
    mentions: { type: Boolean, required: true, default: false }
}, {
    timestamps: true,
});

export default model('Message', MessageSchema);
