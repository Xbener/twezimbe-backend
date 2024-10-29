import mongoose, { Schema, model, Document } from 'mongoose';
import BfSettings from '../model/bf_settings.model';

interface IBf extends Document {
    fundName: string;
    fundDetails: string;
    accountType: 'bank' | 'mobile' | 'wallet';
    accountInfo: string;
    walletAddress?: string;
    groupId: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
}

const BfSchema = new Schema<IBf>(
    {
        fundName: {
            type: String,
            required: true,
        },
        fundDetails: {
            type: String,
            required: true,
        },
        accountType: {
            type: String,
            enum: ['bank', 'mobile', 'wallet'],
            required: true,
        },
        accountInfo: {
            type: String,
            required: function (this: IBf) {
                return this.accountType !== 'wallet';
            },
        },
        walletAddress: {
            type: String,
            required: function (this: IBf) {
                return this.accountType === 'wallet';
            },
        },
        groupId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Group',
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Post-save hook to create a default Bf_settings document
BfSchema.post('save', async function (doc, next) {
    try {
        const bfSettings = new BfSettings({
            bf_id: doc._id,
            max_beneficiaries: 5,
            min_beneficiaries: 1,
        });
        await bfSettings.save();
        next();
    } catch (error) {
        console.log('error creating bf settings', error)
    }
});

const Bf = model<IBf>('Bf', BfSchema);

export default Bf;
