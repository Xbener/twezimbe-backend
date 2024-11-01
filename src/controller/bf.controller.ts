import { Request, Response } from 'express';
import Bf from '../model/bf.model';
import Group from '../model/group.model';
import { ValidateToken } from '../utils/password.utils';
import asyncWrapper from '../middlewares/AsyncWrapper';
import user_bfModel from '../model/user_bf.model';
import mongoose from 'mongoose';
import { sendEmail } from '../utils/notification.utils';
import User from '../model/user.model'
import bf_requestsModel from './bf_requests.model';
import beneficiaryModel from '../model/beneficiary.model';
import principalModel from '../model/principal.model';
import moment from 'moment'

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
        let groupCode = "00001"
        if (lastGroupWithBf) {
            // Extract the last group code and increment it
            const lastGroupCode = parseInt(lastGroupWithBf._id.toString().slice(4, 9));
            groupCode = (lastGroupCode + 1).toString().padStart(5, '0');
        }
        const registrationDate = moment().format("DDMM");
        const walletCode = "10000";

        const walletAddress = `${registrationDate}${groupCode}${walletCode}`;

        // Create the new BF
        const newFund = new Bf({
            fundName,
            fundDetails,
            accountType,
            accountInfo,
            walletAddress: walletAddress.toUpperCase(),
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

    try {
        const fund = await Bf.findOne({ groupId }).populate('createdBy', 'firstName lastName');

        if (!fund) {
            return res.status(404).json({ error: "Bereavement fund not found for this group" });
        }

        res.status(200).json({
            status: true,
            bf: fund
        });
    } catch (error) {
        console.error("Error fetching fund:", error);
        res.status(500).json({ error: "Error fetching fund" });
    }
})

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
            role: "principal"
        })
    }

    const updatedBfUser = await user_bfModel.findOneAndUpdate({ userId: req.body.userId, bf_id: req.body.bf_id }, { ...req.body }, { new: true })
    if (updatedBfUser?.role === 'principal') {
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
    if (!bf) return res.status(404).json({ status: false, message: "Bearevement Fund not found" })
    const bfMemberExists = await user_bfModel.findOne({ bf_id: req.body.bf_id, userId: req.body.userId })
    if (bfMemberExists) return res.status(409).json({ status: false, message: "user is already a member" })
    const newBfMember = await user_bfModel.create({
        bf_id: req.body.bf_id,
        userId: req.body.userId,
        role: req.body.role || 'principal'
    })

    if (newBfMember.role === 'principal') {
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

    sendEmail(`${user?.email}`, "You were added to a Bearevement Fund", `Hello. Admins of ${bf?.fundName} has added you as as ${req.body.role} for the Fund`)
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
    if (!bf) return res.status(404).json({ status: false, message: "Bearevement Fund not found" })
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
    if (!bf) return res.status(404).json({ status: false, message: "Bearevement Fund not found" })
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
    if (!bf) return res.status(404).json({ status: false, message: "Bearevement Fund not found" })
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
    if (!bf) return res.status(404).json({ status: false, message: "Bearevement Fund not found" })

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
    if (!bf) return res.status(404).json({ status: false, message: "Bearevement Fund not found" })

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
    if (!bf) return res.status(404).json({ status: false, message: "Bearevement Fund not found" })

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