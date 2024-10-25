import { model, Schema } from 'mongoose'

const ChatRoomSchema = new Schema({
    name: { type: String, required: true },
    ref: { type: Schema.Types.ObjectId, ref:'Channel', required: false },
    members: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    type: { type: String, enum: ['dm', 'channel'], required: true, default: 'channel' }
}, {
    timestamps: true
})

export default model("ChatRoom", ChatRoomSchema)