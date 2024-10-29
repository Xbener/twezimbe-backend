import mongoose, {Schema, model } from 'mongoose'

const BlockSchema = new Schema({
    blockerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    blockedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});


export default model('blocks', BlockSchema)