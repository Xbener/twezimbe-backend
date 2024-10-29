import { Request, Response } from 'express';
import Bf from '../model/bf.model';
import Group from '../model/group.model';
import { ValidateToken } from '../utils/password.utils';
import asyncWrapper from '../middlewares/AsyncWrapper';


export const createBf = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" });

    const { fundName, fundDetails, accountType, accountInfo, walletAddress, groupId } = req.body;

    try {
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        if (group.has_bf) {
            return res.status(400).json({ error: "Group already has a bereavement fund" });
        }

        const newFund = new Bf({
            fundName,
            fundDetails,
            accountType,
            accountInfo,
            walletAddress,
            groupId,
            createdBy: req.user?._id,
        });

        await newFund.save();

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
            status:true,
            bf: fund
        });
    } catch (error) {
        console.error("Error fetching fund:", error);
        res.status(500).json({ error: "Error fetching fund" });
    }
})