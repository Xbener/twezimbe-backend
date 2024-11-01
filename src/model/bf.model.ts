import mongoose, { Schema, model, Document } from 'mongoose';
import BfSettings from '../model/bf_settings.model';
import BfUser from '../model/user_bf.model';
import principalModel from '../model/principal.model'

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

BfSchema.post('save', async (doc, next) => {

    try {
        const bfUser = new BfUser({
            userId: doc.createdBy,
            bf_id: doc._id,
            role: ["admin", "principal"]
        })

        if (bfUser.role.find(role => role === 'principal')) {
            await principalModel.create({
                userId: doc.createdBy,
                bfId: doc._id,
                contributionAmount: 0,
                membershipFee: 0,
                annualSubscription: 0,
                selectedPlan: 'monthly',
                paymentMethod: 'Mobile Money',
                paymentDetails: '',
                autoPayment: false,
                dueReminder: 'week'
            })
        }

        await bfUser.save();
        next();
    } catch (error) {
        console.log('error creating bf admin', error)
    }
})

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
