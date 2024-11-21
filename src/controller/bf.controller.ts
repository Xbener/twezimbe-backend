import { Request, Response } from 'express';
import Bf from '../model/bf.model';
import Group from '../model/group.model';
import { ValidateToken } from '../utils/password.utils';
import asyncWrapper from '../middlewares/AsyncWrapper';
import user_bfModel from '../model/user_bf.model';
import mongoose from 'mongoose';
import { sendEmail } from '../utils/notification.utils';
import User, { UserDoc } from '../model/user.model'
import bf_requestsModel from '../model/bf_requests.model';
import beneficiaryModel from '../model/beneficiary.model';
import principalModel from '../model/principal.model';
import moment from 'moment'
import bf_caseModel from '../model/bf_case.model';
import Wallet from '../model/wallet.model'
import contributionModel from '../model/contribution.model';
import transactionsModel from '../model/transactions.model';
import bf_settingsModel from '../model/bf_settings.model';
import { update } from './application.controllers';
import { generateWallet } from '../utils/generateWallet';

export const getAllBfs = asyncWrapper(async (req, res) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" });
    if (req?.user?.role !== 'Admin') return res.status(401).json({ message: "Not authorized to visit this page" })

    const bfs = await Bf.aggregate([
        {
            $match: {}
        },
        {
            $lookup: {
                from: "wallets",
                localField: "walletAddress",
                foreignField: "walletAddress",
                as: "wallet"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "createdBy",
                foreignField: "_id",
                as: "createdBy"
            }
        },
        {
            $lookup: {
                from: "groups",
                localField: "groupId",
                foreignField: "_id",
                as: "group"
            }
        },
        {
            $unwind: {
                path: "$group",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $unwind: {
                path: "$wallet",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $unwind: {
                path: "$createdBy",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,
                wallet: 1,
                createdBy: 1,
                walletAddress: 1,
                fundName: 1,
                fundDetails: 1,
                accountType: 1,
                accountInfo: 1,
                group: 1,
                createdAt: 1
            }
        }
    ])

    res.status(200).json({
        status: true,
        bfs
    })
})

export const createBf = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" });

    const { fundName, fundDetails, accountType, accountInfo, groupId } = req.body;

    try {
        // Check if the group exists
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        // Ensure the group doesn't already have a BF
        if (group.has_bf) {
            return res.status(400).json({ error: "Group already has a bereavement fund" });
        }

        const lastGroupWithBf = await Group.findOne({ has_bf: true }).sort({ createdAt: -1 });
        let groupCode = "00001";

        if (lastGroupWithBf) {
            const lastGroupCodeStr = lastGroupWithBf._id.toString().slice(4, 9); // Adjust slicing if necessary
            const lastGroupCode = parseInt(lastGroupCodeStr, 10) || 0; // Fallback to 0 if NaN
            const newCode = lastGroupCode + 1;
            const totalLength = lastGroupCodeStr.length; // Use the length of the sliced portion
            groupCode = newCode.toString().padStart(totalLength, "0");

        const walletAddress = await generateWallet(groupCode, group?._id!, "Bf")
        // Create the new BF
        const newFund = new Bf({
            fundName,
            fundDetails,
            accountType,
            accountInfo,
            walletAddress: walletAddress.toString().toUpperCase(),
            groupId,
            createdBy: req.user?._id,
        });

        await newFund.save();

        // Update the group to mark that it now has a BF
        group.has_bf = true;
        await group.save();

        res.status(201).json({
            status: true,
            bf: newFund
        });
    } catch (error) {
        console.error("Error creating fund:", error);
        res.status(500).json({ error: "Error creating fund" });
    }
});


export const getGroupBf = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" });

    const { groupId } = req.params;
    // Find the BF fund for the specified group
    const fund = await Bf.findOne({ groupId }).populate('createdBy', 'firstName lastName _id');
    if (!fund) {
        return res.status(404).json({ error: "Bereavement fund not found for this group" });
    }


    // Find the user's role within this BF
    const fundUser = await user_bfModel.findOne({ userId: req?.user?._id, bf_id: fund._id });

    // Fetch the wallet associated with the BF
    const wallet = await Wallet.findOne({ ref: fund._id, refType: 'Bf' }).populate({ path: "transactionHistory.user" });

    const contributions = await contributionModel.find({ walletAddress: fund.walletAddress }).populate('contributor')
    res.status(200).json({
        status: true,
        bf: {
            fund,
            role: fundUser?.role,
            wallet: wallet ? {
                walletAddress: wallet.walletAddress,
                balance: wallet.balance,
                transactionHistory: wallet.transactionHistory
            } : null,
            contributions: contributions
        }
    });
});


export const getBfMembers = asyncWrapper(async (req, res) => {
    const members = await user_bfModel.aggregate([
        {
            $match: {
                bf_id: new mongoose.Types.ObjectId(req.params.bf_id),
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "member"
            }
        },
        {
            $lookup: {
                from: "bfs",
                localField: "bf_id",
                foreignField: "_id",
                as: "bf"
            }
        },
        {
            $unwind: {
                path: "$member",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $unwind: {
                path: "$bf",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,
                user: "$member",
                bf: "$bf",
                role: 1,
                createdAt: 1
            }
        }
    ]);

    console.log()
    res.status(200).json({
        status: true,
        members
    })
})


export const updateBfUser = asyncWrapper(async (req, res) => {


    const bfUser = await user_bfModel.findOne({ userId: req.body.userId, bf_id: req.body.bf_id })
    if (!bfUser) {
        let newBfUser = await user_bfModel.create({
            userId: req.body.userId,
            bf_id: req.body.bf_id,
            role: ["principal"]
        })
    }

    const roles1 = bfUser?.role || [];
    const roles2 = ['principal', 'principal'];

    const arraysEqual = (arr1: string[], arr2: string[]) => {
        if (arr1.length !== arr2.length) return false; // Check lengths
        return arr1.every((value, index) => value === arr2[index]); // Check each element
    };

    const role = arraysEqual(roles1, roles2)
        ? [req.body.role, 'principal']
        : bfUser?.role?.map(role => role !== 'principal' ? req.body.role : 'principal');
    const updatedBfUser = await user_bfModel.findOneAndUpdate(
        { userId: req.body.userId, bf_id: req.body.bf_id },
        { ...req.body, role },
        { new: true })
    if (updatedBfUser?.role.find(role => role === 'principal')) {
        await principalModel.create({
            userId: req.body.userId,
            bfId: req.body.bf_id,
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
    res.status(200).json({
        status: true,
        bf_user: updatedBfUser
    })
})


export const addNewBfMember = asyncWrapper(async (req, res) => {

    const user = await User.findOne({ _id: req.body.userId })
    if (!user) return res.status(404).json({ status: false, message: "User not found" })
    const bf = await Bf.findById(req.body.bf_id)
    if (!bf) return res.status(404).json({ status: false, message: "Bereavement Fund not found" })
    const bfMemberExists = await user_bfModel.findOne({ bf_id: req.body.bf_id, userId: req.body.userId })
    if (bfMemberExists) return res.status(409).json({ status: false, message: "user is already a member" })
    const newBfMember = await user_bfModel.create({
        bf_id: req.body.bf_id,
        userId: req.body.userId,
        role: req.body.role === 'admin' ||
            req.body.role === 'supervisor' ||
            req.body.role === 'manager' ||
            req.body.role === 'hr' ? [req.body.role, 'principal'] : [req.body.role]
    })

    if (newBfMember.role.find(role => role === 'principal')) {
        await principalModel.create({
            userId: req.body.userId,
            bfId: req.body.bf_id,
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

    sendEmail(`${user?.email}`, "You were added to a Bereavement Fund", `Hello. Admins of ${bf?.fundName} has added you as as ${req.body.role} for the Fund`)
    res.status(201).json({
        message: "member added successfully",
        bfMember: newBfMember,
        status: true
    })
})

export const applyToJoinBF = asyncWrapper(async (req, res) => {
    const user = await User.findOne({ _id: req.body.userId })
    if (!user) return res.status(404).json({ status: false, message: "User not found" })
    const bf = await Bf.findById(req.body.bf_id)
    if (!bf) return res.status(404).json({ status: false, message: "Bereavement Fund not found" })
    const bfMemberExists = await user_bfModel.findOne({ bf_id: req.body.bf_id, userId: req.body.userId })
    if (bfMemberExists) return res.status(409).json({ status: false, message: "user is already a member" })

    const requestExists = await bf_requestsModel.findOne({ bf_id: req.body.bf_id, user_id: req.body.userId })
    if (requestExists) return res.status(409).json({ status: false, message: "Request was already sent to the admins. Please wait for approval" })
    const newRequest = await bf_requestsModel.create({
        user_id: req.body.userId,
        bf_id: req.body.bf_id
    })

    res.status(201).json({
        status: true,
        message: "Request sent successfully to the admins. Please patiently wait for the approval"
    })
})

export const getBfJoinRequests = asyncWrapper(async (req, res) => {

    const { bf_id } = req.params
    const bf = await Bf.findById(bf_id)
    if (!bf) return res.status(404).json({ status: false, message: "Bereavement Fund not found" })
    const requests = await bf_requestsModel.aggregate([
        {
            $match: {
                bf_id: new mongoose.Types.ObjectId(bf_id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "user_id",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,
                user: "$user",
                bf_id: 1
            }
        }
    ])

    res.status(200).json({
        status: true,
        requests
    })
})

export const acceptBfJoinRequest = asyncWrapper(async (req, res) => {
    const { userId, bf_id, requestId } = req.body
    const user = await User.findOne({ _id: req.body.userId })
    if (!user) return res.status(404).json({ status: false, message: "User not found" })
    const bf = await Bf.findById(req.body.bf_id)
    if (!bf) return res.status(404).json({ status: false, message: "Bereavement Fund not found" })
    const bfMemberExists = await user_bfModel.findOne({ bf_id: req.body.bf_id, userId: req.body.userId })
    if (bfMemberExists) return res.status(409).json({ status: false, message: "user is already a member" })

    const requestExists = await bf_requestsModel.findById(requestId)
    if (!requestExists) return res.status(404).json({ status: false, message: "request was not found on the server" })

    const newBfMember = await user_bfModel.create({
        bf_id,
        userId,
        role: 'principal',

    })
    await principalModel.create({
        userId,
        bfId: bf_id,
        contributionAmount: 0,
        membershipFee: 0,
        annualSubscription: 0,
        selectedPlan: 'monthly',
        paymentMethod: 'Mobile Money',
        paymentDetails: '',
        autoPayment: false,
        dueReminder: 'week'
    })
    await bf_requestsModel.findOneAndDelete({ _id: requestId })
    sendEmail(`${user?.email}`, "Request Accepted", `admins of ${bf?.fundName} has accepted your request to join the fund`)
    res.status(201).json({
        status: true,
        message: "Request accepted successfully",
        newMember: newBfMember
    })

})

export const declineRequest = asyncWrapper(async (req, res) => {

    const { requestId } = req.params

    const requestExists = await bf_requestsModel.findById(requestId)
    if (!requestExists) return res.status(404).json({ status: false, message: "request was not found on the server" })

    const user = await User.findOne({ _id: requestExists.user_id })
    if (!user) return res.status(404).json({ status: false, message: "User not found" })
    const bf = await Bf.findById(requestExists.bf_id)
    if (!bf) return res.status(404).json({ status: false, message: "Bereavement Fund not found" })

    await bf_requestsModel.findOneAndDelete({ _id: requestId })

    sendEmail(`${user?.email}`, "Request Accepted", `admins of ${bf?.fundName} has accepted your request to join the fund`)
    res.status(200).json({
        status: true,
        message: "Request declined successfully"
    })
})


export const addBeneficiary = asyncWrapper(async (req, res) => {
    const user = await User.findById(req.body.userId)
    if (!user) return res.status(404).json({ status: false, message: "User not found" })
    const principal = await User.findById(req.body.principalId)
    if (!principal) return res.status(404).json({ status: false, message: "Principal not found" })
    const bf = await Bf.findById(req.body.bfId)
    if (!bf) return res.status(404).json({ status: false, message: "Bereavement Fund not found" })

    const beneficiaryExists = await beneficiaryModel.findOne(req.body)
    if (beneficiaryExists) return res.status(409).json({ status: false, message: "This user is already your beneficiary" })
    const newBeneficiary = await beneficiaryModel.create(req.body)

    sendEmail(`${user?.email}`, "Invited to become a beneficiary", `Hello. you have been added as a beneficiary for ${principal?.lastName} ${principal.firstName} in ${bf.fundName}`)
    res.status(201).json({
        status: true,
        message: "Beneficiary added successfully",
        beneficiary: newBeneficiary
    })
})

export const getPrincipalBeneficiary = asyncWrapper(async (req, res) => {
    const principal = await User.findById(req.params.principalId)
    if (!principal) return res.status(404).json({ status: false, message: "Principal not found" })
    const bf = await Bf.findById(req.params.bfId)
    if (!bf) return res.status(404).json({ status: false, message: "Bereavement Fund not found" })

    const beneficiaries = await beneficiaryModel.aggregate([
        {
            $match: {
                principalId: new mongoose.Types.ObjectId(req.params.principalId),
                bfId: new mongoose.Types.ObjectId(req.params.bfId)
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: "userId",
                foreignField: "_id",
                as: "beneficiary"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "principalId",
                foreignField: "_id",
                as: 'principal'
            }
        },
        {
            $unwind: {
                path: "$beneficiary",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $unwind: {
                path: "$principal",
                preserveNullAndEmptyArrays: true
            }
        }
    ])

    res.status(200).json({
        status: true,
        beneficiaries
    })
})


export const removeBeneficiary = asyncWrapper(async (req, res) => {
    const removedUser = await beneficiaryModel.findOneAndDelete(req.body)
    if (!removedUser) return res.status(500).json({ status: false, message: "Failed to remove beneficiary. Please try again" })
    res.status(200).json({

        status: true,
        message: "Beneficiary removed successfully"
    })
})


export const updatePrincipalSettings = asyncWrapper(async (req, res) => {
    const updatedPrincipal = await principalModel.findOneAndUpdate({ userId: req.params.principalId }, { ...req.body }, { new: true })
    if (!updatedPrincipal) res.status(404).json({ status: false, message: "Principal not found" })

    return res.status(200).json({
        status: true,
        principal: updatedPrincipal
    })
})

export const getPrincipalSettings = asyncWrapper(async (req, res) => {
    const principal = await principalModel.findOne({ userId: req.params.principalId })
    if (!principal) return res.status(404).json({ status: false, message: "Principal not found" })
    res.status(200).json({
        status: true,
        principal
    })
})

export const getCases = asyncWrapper(async (req, res) => {
    const bf = await Bf.findOne({ _id: req.params.bfId })
    if (!bf) return res.status(404).json({ status: false, message: "Bereavement fund was not found" })

    // const cases = await bf_caseModel.find({ bfId: new mongoose.Types.ObjectId(req.params.bfId) }).populate('principal').populate("affected")
    const cases = await bf_caseModel.aggregate([
        {
            $match: {
                bfId: new mongoose.Types.ObjectId(req.params.bfId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "principal",
                foreignField: "_id",
                as: "principal",
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "affected",
                foreignField: "_id",
                as: "affected",
            },
        },
        {
            $lookup: {
                from: "contributions",
                localField: "_id",
                foreignField: "case",
                as: "contributions",
            },
        },
        {
            $unwind: {
                path: "$contributions",
                preserveNullAndEmptyArrays: true, // Keeps cases with no contributions
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "contributions.contributor",
                foreignField: "_id",
                as: "contributions.contributor",
            },
        },
        {
            $group: {
                _id: "$_id", // Group back by case ID
                principal: { $first: "$principal" },
                affected: { $first: "$affected" },
                bfId: { $first: "$bfId" },
                status: { $first: "$status" },
                contributionStatus: { $first: "$contributionStatus" },
                name: { $first: "$name" },
                description: { $first: "$description" },
                contributions: { $push: "$contributions" }, // Rebuild the contributions array
            },
        },
        {
            $addFields: {
                totalContributions: {
                    $sum: {
                        $map: {
                            input: "$contributions",
                            as: "contribution",
                            in: "$$contribution.amount",
                        },
                    },
                },
            },
        },
    ]);

    return res.status(200).json(
        {
            status: true,
            cases
        }
    )
})


export const fileCase = asyncWrapper(async (req, res) => {
    console.log(req.body)
    if (!req.body.name || !req.body.description) return res.status(400).json({ status: false, message: "Provide all required info" })
    const bf = await Bf.findOne({ _id: req.params.bfId })
    if (!bf) return res.status(404).json({ status: false, message: "Bereavement fund was not found" })
    let principal = await principalModel.findOne({ userId: req.body.principalId, bfId: req.params.bfId }).populate<{ userId: UserDoc }>('userId')
    if (!principal) return res.status(404).json({ status: false, message: "principal not found" })
    const members = await user_bfModel.find({ bfId: req.params.bfId }).populate<{ userId: UserDoc }>('userId');
    const newCase = await bf_caseModel.create({ ...req.body, principal: new mongoose.Types.ObjectId(req.body.principalId), bfId: req.params.bfId })


    if (members.length) {
        members.forEach(member => {
            sendEmail(`${member.userId.email as string}`, "New case filed", `${principal.userId.lastName} ${principal.userId.firstName} has filed a new case for Bereavement fund ${bf.fundName}`)
        })
    }
    res.status(201).json(
        {
            status: true,
            case: await newCase.populate('affected')
        }
    )
})

export const updateCase = asyncWrapper(async (req, res) => {
    const updatedCase = await bf_caseModel.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(req.params.caseId) }, { ...req.body })

    res.status(200).json(
        {
            status: true,
            case: updatedCase
        }
    )
})


export const updateWalletBalance = asyncWrapper(async (req, res) => {
    const { walletAddress, userId, amount } = req.body

    const wallet = await Wallet.findOne({ walletAddress })
    if (!wallet) return res.status(404).json({ status: false, message: "Wallet was not found" })
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ status: false, message: "User was not found" })
    const bf = await Bf.findOne({ walletAddress })
    // if (!bf) return res.status(404).json({ status: false, message: "Bereavement fund not found" })


    await Wallet.findOneAndUpdate(
        { walletAddress },
        {
            $inc: { balance: amount },
            $push: {
                transactionHistory: {
                    type: "Credit",
                    amount,
                    user: userId,
                    date: new Date() // Add the current date for the transaction
                }
            }
        },
        { new: true } // Return the updated document
    );
    if (req.body.wallet) {
        await Wallet.findOneAndUpdate(
            { walletAddress: req.body.wallet },
            {
                $inc: { balance: -amount },
                $push: {
                    transactionHistory: {
                        type: "Debit",
                        amount,
                        user: userId,
                        date: new Date() // Add the current date for the transaction
                    }
                }
            },
            { new: true } // Return the updated document
        );

        const newTransaction = await transactionsModel.create({
            wallet: walletAddress,
            amount,
            user: userId,
            type: "Debit"
        })

        sendEmail(`${user.email}`, "Balance debited", `${amount} have been debited from your wallet`)
    }
    const newTransaction = await transactionsModel.create({
        wallet: walletAddress,
        amount,
        user: userId,
        type: "Credit"
    })

    if (bf) {
        sendEmail(`${user?.email}`, "Fund received", `Dear ${user?.firstName} ${user.lastName} your payment of ${amount} UGX to bereavement Fund ${bf?.fundName} has been received. `)
    }
    sendEmail(`${user.email}`, `Balance updated successfully`, `Dear ${user?.firstName} ${user.lastName}, your deposit of ${amount} UGX have been confirmed. Check your profile for balance.`)
    res.status(200).json(
        {
            status: true,
            message: "Balance updated successfully"
        }
    )
})


export const contributeToBf = asyncWrapper(async (req, res) => {

    const { walletAddress, contributor, amount, contribute_case } = req.body

    const user = await User.findById(contributor)
    if (!user) return res.status(404).json({ status: false, message: "User was not found" })
    const caseExists = await bf_caseModel.findById(contribute_case)
    if (!caseExists) return res.status(404).json({ status: false, message: "Case was not found" })
    const newContribution = await contributionModel.create({
        walletAddress,
        contributor,
        amount,
        case: contribute_case
    })
    const newTransaction = await transactionsModel.create({
        wallet: walletAddress,
        amount,
        user: user._id,
        type: "Credit"
    })

    if (req.body.wallet) {
        await Wallet.findOneAndUpdate(
            { walletAddress: req.body.wallet },
            {
                $inc: { balance: -amount },
                $push: {
                    transactionHistory: {
                        type: "Debit",
                        amount,
                        user: user._id,
                        date: new Date() // Add the current date for the transaction
                    }
                }
            },
            { new: true } // Return the updated document
        );

        const newTransaction = await transactionsModel.create({
            wallet: walletAddress,
            amount,
            user: user._id,
            type: "Debit"
        })

        sendEmail(`${user.email}`, "Balance debited", `${amount} have been debited from your wallet`)
    }

    sendEmail(`${user.email}`, "Contribution received", `Dear ${user.firstName} ${user.lastName}, your contribution to case ${caseExists.name} was received`)

    res.status(201).json({
        status: true,
        message: "Contribution received"
    })
})

export const deleteBf = asyncWrapper(async (req, res) => {
    const bf = await Bf.findById(req.params.bfId)
    if (!bf) return res.status(404).json({ status: false, message: "Fund not found" })
    await Bf.findByIdAndDelete(req.params.bfId)
    await principalModel.deleteMany({ bfId: new mongoose.Types.ObjectId(req.params.bfId) })
    await beneficiaryModel.deleteMany({ bfId: new mongoose.Types.ObjectId(req.params.ObjectId) })
    await bf_settingsModel.findByIdAndDelete(req.params.bfId)
    await Wallet.deleteOne({ ref: new mongoose.Types.ObjectId(req.params.bfId) })
    await Group.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(bf.groupId) }, { has_bf: false })
    await bf_caseModel.deleteMany({ bfId: new mongoose.Types.ObjectId(req.params.bfId) })
    await bf_requestsModel.deleteMany({ bf_id: new mongoose.Types.ObjectId(req.params.bfId) })
    await transactionsModel.deleteMany({ ref: new mongoose.Types.ObjectId(req.params.bfId) })
    await user_bfModel.deleteMany({ bf_id: new mongoose.Types.ObjectId(req.params.bfId) })

    return res.status(200).json({ status: true })
})


export const updateBf = asyncWrapper(async (req, res) => {
    const updatedBf = await Bf.findByIdAndUpdate(req.params.bfId, {
        $set: {
            ...req.body
        }
    }, { new: true })

    res.status(
        200
    ).json(
        {
            status: true,
            message: "Fund updated successfully",
            bf: updatedBf
        }
    )
})