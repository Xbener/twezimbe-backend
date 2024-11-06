import mongoose, { Schema, model } from 'mongoose'

const BfRequestSchema = new Schema({
    bf_id: { type: Schema.Types.ObjectId, ref: 'bf', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, {
    timestamps: true
})

export default model('BfRequest', BfRequestSchema)