import mongoose, { Schema, model } from 'mongoose'


const BereavementCaseSchema = new Schema({
    principal: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bfId: { type: Schema.Types.ObjectId, ref: "Bf", required: true },
    status: { type: String, enum: ['Open', 'Closed'], required: true, default: "Open" },
    contributionStatus: { type: String, enum: ['Complete', 'Incomplete'], default: 'Incomplete' },
    description: {type:String},
    createdDate: { type: Date, default: Date.now }
});


export default model("BfCase", BereavementCaseSchema)