import mongoose, { Schema, model } from 'mongoose'

const ContributionSchema = new Schema({
    walletAddress: { type: String, required: true },
    case: { type: Schema.Types.ObjectId, ref: "BfCase", required: true },
    contributor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
});


export default model('Contribution', ContributionSchema)
