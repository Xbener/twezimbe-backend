import { model, Schema } from 'mongoose'

const ChannelSettingsSchema = new Schema({
    ref: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
    postPermission: { type: String, required: true, default: "anyone", enum: ['anyone', 'moderators', 'admins'] }
}, {

    timestamps: true
})


export default model('Channel_Settings', ChannelSettingsSchema)