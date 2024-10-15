import { NextFunction, Request, Response } from "express";
import asyncWrapper from "../middlewares/AsyncWrapper";
import { ValidateToken } from "../utils/password.utils";
import Group from '../model/group.model'
import Role from '../model/role.model'
import UserGroup from '../model/user_group.model'
import RoleUser from "../model/user_role";
import mongoose from "mongoose";
import User from "../model/user.model";

export const addGroup = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const isTokenValid = await ValidateToken(req);

    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })
    const existingGroup = await Group.findOne({ name: req.body.name });
    if (existingGroup) return res.status(403).json({ errors: `Group with ${existingGroup.name}. Please try a different name` })
    const newGroup = await Group.create(req.body)


    if (newGroup) {
        const ManagerRole = await Role.findOne({ role_name: "GroupManager" })
        const UserRole = await Role.findOne({ role_name: "GroupUser" })

        const newManager = await UserGroup.create({
            user_id: req?.body?.created_by,
            group_id: newGroup?._id,
            role_id: ManagerRole?.id
        })

        if (newManager) {
            req?.body?.selectedUsers_Id?.forEach(async (user_id: string) => {
                await UserGroup.create({
                    user_id: user_id,
                    group_id: newGroup?._id,
                    role_id: UserRole?.id
                })

            })
        }

        await RoleUser.create({
            user_id: req?.body?.created_by,
            role_id: ManagerRole?.id
        })

        req?.body?.selectedUsers_Id?.forEach(async (user_id: string) => {
            await RoleUser.create({
                user_id: user_id,
                role_id: UserRole?.id
            })
        })

        res.status(200).json({ group: newGroup, message: "Group Created successfully" })
    }

})



export const getPublicGroups = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    }

    const existingUser = await User.findOne({ email: req.user?.email });

    if (!existingUser) {
        return res.status(400).json({ message: "User not found" });
    }

    const userId = existingUser?.id;

    if (userId) {
        try {
            if (typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid userId: must be a valid ObjectId string');
            }

            const joinedGroups = await UserGroup.find({ user_id: userId }).distinct('group_id');

            const result = await Group.aggregate([
                {
                    $match: {
                        _id: { $nin: joinedGroups },
                        group_state: "Public",
                        del_flag: 0
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'created_by',
                        foreignField: '_id',
                        as: 'createdByDetails'
                    }
                },
                {
                    $unwind: '$createdByDetails'
                },
                {
                    $lookup: {
                        from: 'user_groups', // Adjust to your actual UserGroup collection name
                        localField: '_id',
                        foreignField: 'group_id',
                        as: 'members'
                    }
                },
                {
                    // Filter out duplicates by using Set to get unique member IDs
                    $addFields: {
                        uniqueMembers: { $setUnion: '$members.user_id' }
                    }
                },
                {
                    // Calculate member count based on unique members
                    $addFields: {
                        memberCount: { $size: '$uniqueMembers' }
                    }
                },
                {
                    $project: {
                        group_id: '$_id',
                        group_name: '$name',
                        group_type: '$group_type',
                        group_state: '$group_state',
                        group_avatar: '$group_avatar',
                        description: '$description',
                        tags: '$tags',
                        created_by: '$createdByDetails.name',
                        del_flag: '$del_flag',
                        createdAt: '$createdAt',
                        updatedAt: '$updatedAt',
                        memberCount: 1 
                    }
                }
            ]);



            res.status(200).json({ message: "Successfully fetched unjoined groups", groups: result });
        } catch (err) {
            next(err);
        }
    } else {
        return res.status(400).json({ message: "Failed to fetch unjoined groups" });
    }
})


export const getJoinedGroupList = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    }

    const existingUser = await User.findOne({ email: req.user?.email });
    if (!existingUser) {
        return res.status(400).json({ message: "User not found" });
    }

    const userId = existingUser?.id;

    if (userId) {
        try {
            if (typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid userId: must be a valid ObjectId string');
            }

            const result = await UserGroup.aggregate([
                {
                    $match: { user_id: new mongoose.Types.ObjectId(userId) }
                },
                {
                    $lookup: {
                        from: 'roles', // collection name in MongoDB
                        localField: 'role_id',
                        foreignField: '_id',
                        as: 'roleDetails'
                    }
                },
                {
                    $unwind: '$roleDetails'
                },
                {
                    $lookup: {
                        from: 'groups', // Collection name in MongoDB
                        localField: 'group_id',
                        foreignField: '_id',
                        as: 'groupDetails'
                    }
                },
                {
                    $unwind: '$groupDetails'
                },
                {
                    $group: {
                        _id: '$groupDetails._id', // Group by group ID
                        group_id: { $first: '$groupDetails._id' },
                        role_name: { $first: '$roleDetails.role_name' },
                        group_name: { $first: '$groupDetails.name' },
                        group_type: { $first: '$groupDetails.group_type' },
                        group_state: { $first: '$groupDetails.group_state' },
                        group_avatar: { $first: '$groupDetails.group_avatar' },
                        description: { $first: '$groupDetails.description' },
                        tags: { $first: '$groupDetails.tags' },
                        created_by: { $first: '$groupDetails.created_by' },
                        del_flag: { $first: '$groupDetails.del_flag' },
                        createdAt: { $first: '$groupDetails.createdAt' },
                        updatedAt: { $first: '$groupDetails.updatedAt' }
                    }
                }
            ]);

            res.status(201).json({ message: "successfully", groups: result });

        } catch (err) {
            throw err;
        }
    } else {
        return res.status(400).json({ message: "Failed" });
    }
});
