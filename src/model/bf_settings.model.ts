import mongoose, { Schema, model } from 'mongoose'

const BfSettingsSchema = new Schema({

    bf_id: { type: Schema.Types.ObjectId, ref: 'Bf', required: true },
    max_beneficiaries: { type: Number, default: 1, required: true, max: 1 },
    min_beneficiaries: { type: Number, default: 0, required: true, min: 0 },
}, {
    timestamps: true
})


export default model('Bf_settings', BfSettingsSchema)