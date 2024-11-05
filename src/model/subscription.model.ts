import mongoose, {Schema, model} from 'mongoose'

const SubscriptionSchema = new Schema({
    principal: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Active', 'Inactive', 'Pending'], required: true },
    enrollmentDate: { type: Date, default: Date.now },
    contributionHistory: [{ type: Schema.Types.ObjectId, ref: 'Contribution' }]
});


export default model("Subscription", SubscriptionSchema)    