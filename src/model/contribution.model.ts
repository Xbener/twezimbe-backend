import mongoose, { Schema, model } from 'mongoose'

const ContributionSchema = new Schema({
    wallet: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    case: { type: Schema.Types.ObjectId, ref: "BfCase", required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
});


export default model('Contribution', ContributionSchema)
