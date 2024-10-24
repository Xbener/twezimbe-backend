import { Schema, model } from 'mongoose'

const ReadReceiptSchema = new Schema({
    messageId: { type: Schema.Types.ObjectId, ref: 'messages', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    isRead: { type: Boolean, required: true, default: false },
    readAt: { type: Date, required: false },
    chatroom: { type: Schema.Types.ObjectId, ref: 'chatrooms', required: true }

}, {
    timestamps: true
})


export default model('Read-Receipts', ReadReceiptSchema)