import { model, Schema } from 'mongoose'

const ChatRoomSchema = new Schema({
    name: { type: String, required: true },
    ref: { type: Schema.Types.ObjectId, required: true },
    members: [{ type: Schema.Types.ObjectId, required: true }],
    type: { type: String, enum: ['dm', 'channel'], required: true, default: 'channel' }
}, {
    timestamps: true
})

export default model("ChatRoom", ChatRoomSchema)