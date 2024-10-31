import mongoose, { Schema, model } from 'mongoose';

const principalSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bfId: { type: Schema.Types.ObjectId, ref: "Bf", required: true },
    contributionAmount: { type: Number, required: true, default: 0 },
    membershipFee: { type: Number, required: true, default: 0 },
    annualSubscription: { type: Number, required: true, default: 0 },
    selectedPlan: { type: String, enum: ['monthly', 'annual', 'other'], required: true },
    paymentMethod: { type: String, enum: ['Mobile Money', 'Bank Transfer', 'Credit Card'], required: true },
    paymentDetails: { type: String, required: false, default: '' },
    autoPayment: { type: Boolean, required: true, default: false },
    dueReminder: { type: String, enum: ['day', 'week', 'month'], required: true, default: 'week' }
}, {
    timestamps: true
});

export default model('Principal', principalSchema);
