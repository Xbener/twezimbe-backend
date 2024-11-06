import mongoose, { Schema, model } from 'mongoose'

const WalletSchema = new Schema(
    {
        refType: { type: String, enum: ['User', 'Bf'] },
        ref: {
            type: Schema.Types.ObjectId,
            refPath: 'refType'
        },
        walletAddress: {type:String, required:true},
        transactionHistory: [
            {
                type: { type: String, enum: ['Credit', 'Debit'], required: true },
                amount: { type: Number, required: true },
                date: { type: Date, default: Date.now },
                 user: { type: String, ref:"User", required: true }
            }
        ],
        balance: { type: Number, default: 0 }
    },
    {
        timestamps: true
    }
)

export default model('Wallet', WalletSchema)