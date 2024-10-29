import mongoose, { Schema, model, Document } from 'mongoose';

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

const Bf = model<IBf>('Bf', BfSchema);

export default Bf;
