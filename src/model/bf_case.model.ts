import mongoose, { Schema, model } from 'mongoose'


const BereavementCaseSchema = new Schema({
    principal: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bfId: { type: Schema.Types.ObjectId, ref: "Bf", required: true },
    status: { type: String, enum: ['Open', 'Closed'], required: true, default: "Open" },
    contributionStatus: { type: String, enum: ['Complete', 'Incomplete'], default: 'Incomplete' },
    name: { type: String, required: true },
    description: { type: String, required: true },
    affected: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, {
    timestamps: true
});


export default model("BfCase", BereavementCaseSchema)