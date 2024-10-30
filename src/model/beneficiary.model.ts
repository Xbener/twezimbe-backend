import mongoose, { Schema, Types,model } from 'mongoose'

const BeneficiarySchema = new Schema({

    principalId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bfId: { type: Schema.Types.ObjectId, ref: "Bf", required: true }
}, {
    timestamps: true
})

export default model('Beneficiary', BeneficiarySchema)