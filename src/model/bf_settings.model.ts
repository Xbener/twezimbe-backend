import mongoose, { Schema, model } from 'mongoose';

const FundBenefitsSchema = new Schema({
    principal: { type: Number, default: 0 },
    spouse: { type: Number, default: 0 },
    children: { type: Number, default: 0 },
    parents: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
});

const SubscriptionCostsSchema = new Schema({
    youth: { type: Number, default: 0 },
    children: { type: Number, default: 0 },
    elders: { type: Number, default: 0 },
});

const BfSettingsSchema = new Schema({
    bf_id: { type: Schema.Types.ObjectId, ref: 'Bf', required: true },
    maxBeneficiaries: { type: Number, default: 1, required: true, min: 0 },
    minBeneficiaries: { type: Number, default: 1, required: true, min: 1 },
    membership_fee: { type: Number, default: 0, required: true },
    subscription_costs: { type: SubscriptionCostsSchema, default: {} },
    fund_benefits: { type: FundBenefitsSchema, default: {} },
    incident_contribution_fee: { type: Number, default: 0, required: true },
    in_kind_support: { type: String, default: "" },
}, {
    timestamps: true,
});

export default model('Bf_settings', BfSettingsSchema);
