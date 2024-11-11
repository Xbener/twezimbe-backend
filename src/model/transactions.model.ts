import mongoose, { Schema, model } from 'mongoose'

const TransactionSchema = new Schema({
    type: { type: String, enum: ['Credit', 'Debit'], required: true },
    amount: { type: Number, required: true },
    user: { type: String, ref: "User", required: true },
    wallet: { type: String, ref: "Wallet", required: true }
}, {
    timestamps: true

})


export default model("Transaction", TransactionSchema)