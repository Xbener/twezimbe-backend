import { model, Schema } from 'mongoose'
import ChannelSettings from './channel_settings.model'; 

export type ChannelDoc = {
    groupId: typeof Schema.Types.ObjectId;
    name: string;
    memberCount: number;
    description: string;
    state: 'public' | 'private';
    created_by: typeof Schema.Types.ObjectId;
}

const ChannelSchema = new Schema<ChannelDoc>({
    groupId: { type: Schema.Types.ObjectId, ref: 'groups' },
    name: { type: String, required: true },
    memberCount: { type: Number, required: true, default: 1 },
    description: { type: String, required: false },
    state: { type: String, enum: ['public', 'private'], default: 'public' },
    created_by: { type: Schema.Types.ObjectId, ref: 'users', required: true }
},
    {
        timestamps: true
    }
)

ChannelSchema.post('save', async function (doc) {
    try {
        // Create default settings for the new channel
        await ChannelSettings.create({
            ref: doc._id, // Use the new channel's ID
            postPermission: 'anyone', // Default permission level
        });
    } catch (error) {
        console.error('Error creating default channel settings:', error);
    }
});


export default model('Channel', ChannelSchema)