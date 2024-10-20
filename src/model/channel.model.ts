import { model, Schema } from 'mongoose'

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


export default model('Channel', ChannelSchema)