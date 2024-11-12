import { NextFunction, Request, Response } from "express";
import asyncWrapper from "../middlewares/AsyncWrapper";
import { ValidateToken } from "../utils/password.utils";
import Group, { GroupDoc } from '../model/group.model'
import Role, { RoleDoc } from '../model/role.model'
import UserGroup from '../model/user_group.model'
import RoleUser from "../model/user_role";
import mongoose from "mongoose";
import User, { UserDoc } from "../model/user.model";
import { sendEmail } from "../utils/notification.utils";
import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'
import GroupRequest from "../model/group_requests.model";
import { stripe } from "..";
import Channel from '../model/channel.model'
import UserChannel from '../model/user_channel.model'
import chatroomModel from "../model/chatroom.model";

export const addGroup = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const isTokenValid = await ValidateToken(req);

    if (!isTokenValid) return res.status(403).json({ errors: "Access denied" })
    const existingGroup = await Group.findOne({ name: req.body.name });
    if (existingGroup) return res.status(403).json({ errors: `Group with ${existingGroup.name}. Please try a different name` })
    let newGroup = await Group.create(req.body)


    if (newGroup) {
        newGroup.invite_link = `${process.env.FRONTEND_URL}/groups/invitation/${newGroup._id}`
        await newGroup.save()
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
        const newChannels = await Channel.insertMany([
            {
                name: "general",
                description: "this is the default channel",
                groupId: newGroup?._id,
                memberCount: 1,
                created_by: newGroup?.created_by,
                state: 'public'
            },
            {
                name: "announcements",
                description: "this is the announcements channel",
                groupId: newGroup?._id,
                memberCount: 1,
                created_by: newGroup?.created_by,
                state: 'public'
            }
        ])
        if (newChannels) {
            const chatRoomsData = newChannels.map(channel => ({
                name: channel.name,
                ref: channel._id,
                members: [req?.body?.created_by]
            }));

            const newChatRooms = await chatroomModel.insertMany(chatRoomsData);

            const role = await Role.findOne({ role_name: "ChannelAdmin" })
            const userChannelsData = newChannels.map(channel => ({
                channel_id: channel._id,
                role_id: role?._id,
                user_id: req?.user?._id,
                group_id: channel?.groupId
            }));

            const newUserChannels = await UserChannel.insertMany(userChannelsData);
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

        newGroup = await newGroup.populate('created_by')

        const createdBy = newGroup.created_by as UserDoc

        sendEmail(`${createdBy.email}`, "Twezimbe Groups - Invitation Link", `Use this link to invite members of your group ${newGroup.name} --> ${newGroup.invite_link}`)

        res.status(200).json({ group: newGroup, message: "Group Created successfully", invitationLink: newGroup.invite_link })
    }

})

export const getAllGroups = asyncWrapper(async (req, res) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    }

    if (req.user?.role !== "Admin") return res.status(401).json({ status: false, message: "You are not allowed to access this resource" })

    const groups = await Group.aggregate([
        {
            $match: {}
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
                from: 'user_groups',
                localField: '_id',
                foreignField: 'group_id',
                as: 'members'
            }
        },
        {
            $addFields: {
                uniqueMembers: { $setUnion: '$members.user_id' }
            }
        },
        {
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
                group_picture: '$group_picture',
                invite_link: '$invite_link', // Access directly
                description: '$description',
                upgraded: '$upgraded', // Access directly
                isSacco: '$isSacco', // Access directly
                has_bf: '$has_bf', // Access directly
                tags: '$tags',
                created_by: '$createdByDetails',
                del_flag: '$del_flag',
                createdAt: '$createdAt',
                updatedAt: '$updatedAt',
                memberCount: 1,
                members: "$members",
                suspended: "$suspended"
            }
        }
    ]);
    return res.status(200).json({
        groups
    })
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
                        group_state: { $ne: "Invite-Only" },
                        del_flag: 0,
                        $or: [{ suspended: false }, { suspended: { $exists: false } }]
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
                        from: 'user_groups',
                        localField: '_id',
                        foreignField: 'group_id',
                        as: 'members'
                    }
                },
                {
                    $addFields: {
                        uniqueMembers: { $setUnion: '$members.user_id' }
                    }
                },
                {
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
                        group_picture: '$group_picture',
                        invite_link: '$invite_link', // Access directly
                        description: '$description',
                        upgraded: '$upgraded', // Access directly
                        isSacco: '$isSacco', // Access directly
                        has_bf: '$has_bf', // Access directly
                        tags: '$tags',
                        created_by: '$createdByDetails.name',
                        del_flag: '$del_flag',
                        createdAt: '$createdAt',
                        updatedAt: '$updatedAt',
                        memberCount: 1,
                        members: "$members",
                        suspended: "suspended"
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
                    $match: {
                        user_id: new mongoose.Types.ObjectId(userId),
                        $or: [{ suspended: false }, { suspended: { $exists: false } }]
                    }
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
                        group_picture: { $first: '$groupDetails.group_picture' },
                        description: { $first: '$groupDetails.description' },
                        invite_link: { $first: "$groupDetails.invite_link" },
                        tags: { $first: '$groupDetails.tags' },
                        upgraded: { $first: "$groupDetails.upgraded" },
                        isSacco: { $first: "$groupDetails.isSacco" },
                        has_bf: { $first: "$groupDetails.has_bf" },
                        created_by: { $first: '$groupDetails.created_by' },
                        del_flag: { $first: '$groupDetails.del_flag' },
                        createdAt: { $first: '$groupDetails.createdAt' },
                        updatedAt: { $first: '$groupDetails.updatedAt' },
                        suspended: { $first: "$groupDetails.suspended" }
                    }
                }
            ]);

            res.status(201).json({ message: "successfully", groups: result.filter(group => !group.suspended) });

        } catch (err) {
            throw err;
        }
    } else {
        return res.status(400).json({ message: "Failed" });
    }
});



export const getGroupById = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    }

    const existingUser = await User.findOne({ email: req.user?.email });
    const firstChannel = await Channel.findOne({ groupId: new mongoose.Types.ObjectId(req.params.groupId) }).select("_id")
    if (!existingUser) {
        return res.status(400).json({ message: "User not found" });
    }

    const userId = existingUser?.id;

    // Aggregation to get the group and its unique members along with their roles
    const groupDetails = await Group.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.params.groupId),
                del_flag: 0, // Ensuring the group is not deleted,
                $or: [{ suspended: false }, { suspended: { $exists: false } }]
            }
        },
        {
            $lookup: {
                from: 'user_groups', // UserGroup collection
                localField: '_id',
                foreignField: 'group_id',
                as: 'userGroups' // Renamed to avoid confusion
            }
        },
        {
            $lookup: {
                from: 'users', // Assuming this is the correct collection name for users
                localField: 'created_by',
                foreignField: '_id',
                as: 'created_by'
            }
        },
        {
            $lookup: {
                from: 'users', // Collection containing user details
                localField: 'userGroups.user_id', // Assuming user_id field in user_groups
                foreignField: '_id',
                as: 'memberDetails'
            }
        },
        {
            $unwind: {
                path: '$userGroups',
                preserveNullAndEmptyArrays: true // Keep the group even if there are no members
            }
        },
        {
            $lookup: {
                from: 'roles', // Role collection to fetch role names
                localField: 'userGroups.role_id', // Assuming role_id field in user_groups
                foreignField: '_id',
                as: 'roleDetails' // Get role details
            }
        },
        {
            $unwind: {
                path: '$roleDetails',
                preserveNullAndEmptyArrays: true // Keep members even if they have no role
            }
        },
        {
            $group: {
                _id: { userId: '$userGroups.user_id', group_id: '$_id' }, // Group by userId to avoid duplicates
                group_id: { $first: '$_id' },
                group_name: { $first: '$name' },
                group_type: { $first: '$group_type' },
                group_state: { $first: '$group_state' },
                group_picture: { $first: '$group_picture' },
                description: { $first: '$description' },
                tags: { $first: '$tags' },
                invite_link: { $first: "$invite_link" },
                upgraded: { $first: "$upgraded" },
                has_bf: { $first: "$has_bf" },
                isSacco: { $first: "$isSacco" },
                created_by: { $first: '$created_by' },
                del_flag: { $first: '$del_flag' },
                createdAt: { $first: '$createdAt' },
                updatedAt: { $first: '$updatedAt' },
                suspended: { $first: "$suspended" },
                members: {
                    $addToSet: {
                        users: "$memberDetails",
                        // role: '$roleDetails.role_name'
                    }
                }
            }
        },
        {
            // Final grouping to flatten members
            $group: {
                _id: '$_id.group_id', // Group by group_id
                group_id: { $first: '$_id.group_id' },
                group_name: { $first: '$group_name' },
                group_type: { $first: '$group_type' },
                group_state: { $first: '$group_state' },
                group_picture: { $first: '$group_picture' },
                description: { $first: '$description' },
                tags: { $first: '$tags' },
                invite_link: { $first: "$invite_link" },
                upgraded: { $first: "$upgraded" },
                isSacco: { $first: "$isSacco" },
                has_bf: { $first: "$has_bf" },
                created_by: { $first: '$created_by' },
                del_flag: { $first: '$del_flag' },
                createdAt: { $first: '$createdAt' },
                updatedAt: { $first: '$updatedAt' },
                members: { $first: { $arrayElemAt: ["$members.users", 0] } },
                suspended: { $first: "$suspended" }
            }
        }
    ]);

    if (!groupDetails.length) {
        return res.status(404).json({ errors: "Group not found" });
    }

    res.status(200).json({
        Success: true,
        message: "Group found",
        group: groupDetails[0],
        default_channel: firstChannel?._id,
    });
});

export const getGroupMembers = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);

    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    }

    const { groupId } = req.params
    const userGroups = await UserGroup.find({ group_id: groupId })
        .populate("user_id")
        .populate("group_id")
        .populate("role_id")

    const updatedUserGroups = userGroups.map(group => {
        const user = group.user_id as UserDoc;     // User information
        const role = group.role_id as RoleDoc;     // Role information
        const groupData = group.group_id as GroupDoc; // Group information

        return {
            userId: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            profile_pic: user.profile_pic,
            email: user.email,
            role: role?.role_name,   // e.g., GroupManager, GroupModerator, GroupUser
            groupId: groupData._id,      // Group ID
            groupName: groupData.name,   // Group name (if available)
        };
    });


    res.status(200).json({
        status: true,
        members: updatedUserGroups
    })
})

export const joinGroup = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const isTokenValid = await ValidateToken(req);

    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    }


    const existingGroup = await UserGroup.findOne({ user_id: req.body.user_id, group_id: req.body.group_id });

    if (existingGroup) {
        return res.status(400).json({ message: "You have already joined!" });
    } else {
        const role = await Role.findOne({ role_name: "GroupUser" });
        const group = await Group.findById(req.body.group_id).populate('created_by');
        const createdByUser = group?.created_by as UserDoc;

        if (!group?.upgraded && group?.memberCount! >= 100) {
            sendEmail(createdByUser.email, `Upgrade ${group?.name}`, `Upgrade your Twezimbe Groups plan to have unlimited members in your group`);
            return res.status(403).json({
                status: false,
                errors: "Unable to Join Group. Member limit reached. Please contact the group admins"
            })
        }
        const newJoinGroup = await UserGroup.create({
            user_id: req.body.user_id,
            group_id: req.body.group_id,
            role_id: role?._id
        });

        const generalChannel = await Channel.find({ state: 'public', groupId: req.body.group_id });

        generalChannel.forEach(async channel => {
            const newUserChannel = await UserChannel.create({
                channel_id: channel?._id,
                role_id: role?._id,
                user_id: req?.user?._id,
                group_id: group?._id
            })

            await chatroomModel.updateMany(
                {
                    ref: channel?._id,
                    $or: [
                        { name: 'general' },
                        { name: 'announcements' }
                    ]
                },
                {
                    $push: {
                        members: req?.user?._id
                    }
                }
            );

        })

        if (newJoinGroup) {
            const existingRole = await RoleUser.findOne({ user_id: req.body.user_id, role_id: role?._id });

            if (!existingRole) {
                await RoleUser.create({
                    user_id: req.body.user_id,
                    role_id: role?._id
                });
            }

            if (createdByUser && createdByUser.email) {
                sendEmail(createdByUser.email, "Twezimbe Groups - New Member", `${group?.name} has a new member!`);
            } else {
                console.error('Could not find email for group owner');
            }
            await Group.findByIdAndUpdate(group?._id, { $inc: { memberCount: 1 } });
            res.status(201).json({ message: "New role added successfully", group: newJoinGroup });
        }
    }
});


export const leaveGroup = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    };

    const { groupId } = req.params
    const userId = req?.user?._id!

    const userExists = await User.findOne({ _id: userId })
    if (!userExists) return res.status(404).json({ errors: "User not found" })

    const groupExists = await Group.findOne({ _id: groupId }).populate('created_by')
    if (!groupExists) return res.status(404).json({ errors: "Group was not found" })

    const userIsMember = await UserGroup.findOne({ user_id: userId, group_id: groupId })
    if (!userIsMember) return res.status(404).json({ errors: "User is Not a member" })

    const created_by = groupExists.created_by as UserDoc
    if (created_by._id == userId) return res.status(409).json({ status: false, errors: "You can't leave a group as an admin" })

    const removedUser = await UserGroup.deleteMany({ user_id: userId, group_id: groupId })
    if (!removedUser) return res.status(500).json({ errors: "Something went wrong" })

    const removedChannels = await UserChannel.deleteMany({ user_id: userId, group_id: groupId })

    groupExists.memberCount -= 1
    await groupExists.save()

    res.status(200).json({
        status: true
    })
})


export const deleteGroup = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    };

    const { groupId } = req.params
    const userId = req?.user?._id!

    const userExists = await User.findOne({ _id: userId })
    if (!userExists) return res.status(404).json({ errors: "User not found" })

    const groupExists = await Group.findOne({ _id: groupId }).populate('created_by')
    if (!groupExists) return res.status(404).json({ errors: "Group was not found" })

    const created_by = groupExists.created_by as UserDoc
    if (created_by._id != userId || req.user?.role !== 'Admin') return res.status(409).json({ status: false, errors: "You Don't have privilege to delete this group" })


    await UserGroup.deleteMany({ group_id: groupId })
    await GroupRequest.deleteMany({ groupId })
    await Group.deleteOne({ _id: groupId })

    return res.status(200).json({
        status: true,
        message: "Group removed successfully"
    })

})

export const updateGroupPicture = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    };

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req?.user?._id;
    const groupId = req.body.groupId

    const existingUser = await User.findOne({ _id: userId });
    if (!existingUser) {
        return res.status(400).json({ message: "User not found" });
    }

    const existingGroup = await UserGroup.findOne({ user_id: userId, group_id: groupId });
    if (!existingGroup) return res.status(404).json({ errors: "Group not found" })


    const uploadResult = await cloudinary.uploader.upload(req.file.path);
    const updatedGroup = await Group.findByIdAndUpdate(groupId, {
        group_picture: uploadResult.secure_url
    });

    if (!updatedGroup) {
        return res.status(404).json({ message: 'Group not found' });
    }

    fs.unlink(req.file.path, (err) => {
        if (err) {
            console.error('Error deleting file:', err);
        }
    });

    res.status(200).json({
        message: 'Group Profile picture uploaded successfully',
        profilePicUrl: uploadResult.secure_url,
        group: updatedGroup,
        status: true
    });
})


export const updateGroup = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    };

    const existingGroup = await UserGroup.findOne({ user_id: req?.user?._id, group_id: req.body.group_id });
    if (!existingGroup) return res.status(404).json({ errors: "Group not found" })
    const group = await Group.findOne({ _id: req.body.group_id })

    if (req.body.isSacco && group?.memberCount! < 5) {
        return res.status(403).json({ errors: "Can't Transition to SACCO. You need at least 5 members of the group." })
    }

    const updatedGroup = await Group.findByIdAndUpdate(req.body.group_id, {
        $set: {
            ...req.body
        }
    })

    if (!updatedGroup) return res.status(500).json({ errors: "Something went wrong. Please try again" })

    res.status(200).json({
        status: true,
        message: "group successfully updated"
    })

})

export const RequestToJoinGroup = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    };

    const existingUser = await User.findOne({ _id: req?.user?._id });
    if (!existingUser) {
        return res.status(400).json({ message: "User not found" });
    }

    const existingGroup = await Group.findOne({ _id: req.body.groupId }).populate('created_by');
    if (!existingGroup) return res.status(404).json({ errors: "Group not found" })

    const createdBy = await existingGroup.created_by as UserDoc;

    // check if request does not exists already
    const request_exists = await GroupRequest.findOne(req.body)
    if (request_exists) return res.status(409).json({ errors: "Request already sent. Please wait for admin approval" })
    const newRequest = await GroupRequest.create(req.body)
    if (!newRequest) return res.status(500).json({ errors: "Something went wrong" })

    sendEmail(`${createdBy.email}`, `${existingGroup?.name} - New Join Request`, `${existingUser?.email} has requested to join your group. Visit the platform to confirm`)

    res.status(201).json({
        status: true,
        message: "New request sent successfully"
    })

})


export const getGroupRequests = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    };

    const groupRequests = await GroupRequest.find({ groupId: req.params.groupId }).populate('userId').populate('groupId')

    res.status(200).json({
        status: true,
        message: "Group Requests found",
        groupRequests: groupRequests.map(request => ({
            user: request.userId,
            group: request.groupId,
            _id: request._id
        }))
    })
})


export const declineRequest = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    };

    const { userId, groupId, requestId } = req.query

    const userExists = await User.findOne({ _id: userId })
    if (!userExists) return res.status(404).json({ errors: "User not found" })

    const groupExists = await Group.findOne({ _id: groupId })
    if (!groupExists) return res.status(404).json({ errors: "Group was not found" })

    const requestExists = await GroupRequest.findOne({ _id: requestId })
    if (!requestExists) return res.status(404).json({ errors: "Request was not found" })

    const deletedRequest = await GroupRequest.findByIdAndDelete(requestId)
    if (!deletedRequest) return res.status(500).json({ errors: "Something went wrong when deleting request. Please try again" })


    sendEmail(`${userExists.email}`, "Request Declined", `Your request to join ${groupExists.name} was declined by admins`)
    res.status(200).json({
        status: true,
        message: "Request was declined successfully"
    })

})

export const acceptRequest = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    }

    const { userId, groupId, requestId } = req.body;

    console.log(req.body)

    const userExists = await User.findOne({ _id: userId });
    if (!userExists) return res.status(404).json({ errors: "User not found" });

    const groupExists = await Group.findOne({ _id: groupId }).populate('created_by');
    if (!groupExists) return res.status(404).json({ errors: "Group was not found" });

    const requestExists = await GroupRequest.findOne({ _id: requestId });
    if (!requestExists) return res.status(404).json({ errors: "Request was not found" });

    // Check for existing membership
    const existingGroup = await UserGroup.findOne({ user_id: userId, group_id: groupId });
    if (existingGroup) {
        return res.status(400).json({ message: "User is already a member!" });
    }

    const role = await Role.findOne({ role_name: "GroupUser" });
    const createdByUser = groupExists.created_by as UserDoc;

    // Check member limit
    if (!groupExists.upgraded && groupExists.memberCount >= 100) {
        sendEmail(createdByUser.email, `Upgrade ${groupExists.name}`, `Upgrade your Twezimbe Groups plan to have unlimited members in your group`);
        return res.status(403).json({
            status: false,
            errors: "Unable to accept request. Member limit reached."
        });
    }

    // Create the new membership
    const newJoinGroup = await UserGroup.create({
        user_id: userId,
        group_id: groupId,
        role_id: role?._id
    });

    const generalChannel = await Channel.find({ state: 'public', groupId });
    const channelRole = await Role.findOne({ role_name: "ChannelMember" })

    generalChannel.forEach(async channel => {
        const newUserChannel = await UserChannel.create({
            channel_id: channel?._id,
            role_id: channelRole?._id,
            user_id: userId,
            group_id: groupId
        })

        await chatroomModel.updateMany(
            {
                ref: channel?._id,
                $or: [
                    { name: 'general' },
                    { name: 'announcements' }
                ]
            },
            {
                $push: {
                    members: userId
                }
            }
        );
    })

    if (newJoinGroup) {
        // Create role if not exists
        const existingRole = await RoleUser.findOne({ user_id: userId, role_id: role?._id });
        if (!existingRole) {
            await RoleUser.create({
                user_id: userId,
                role_id: role?._id
            });
        }

        // Notify group creator
        sendEmail(`${userExists.email}`, "Twezimbe Groups - Membership approved", `admins have approved your request to join ${groupExists.name}`);

        // Update member count
        await Group.findByIdAndUpdate(groupId, { $inc: { memberCount: 1 } });

        await GroupRequest.findByIdAndDelete(requestId);

        res.status(201).json({ status: true, message: "Request accepted and user added to the group", group: newJoinGroup });
    }
});



export const upgradePlan = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const { groupId } = req.body;

    const groupExists = await Group.findOne({ _id: groupId }).populate('created_by');
    if (!groupExists) return res.status(404).json({ errors: "Group was not found" });

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price: "price_1QArpBBtQjOArbSaV1KfrgCF",
            quantity: 1
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payment_success?groupId=${groupId}&success=true`,
        cancel_url: `${process.env.FRONTEND_URL}`
    }).catch((err: any) => console.log('error creating checkout session:', err.message))
    res.status(201).json({
        id: session.id,
        url: session.url
    })
})


export const captureWebHook = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const event = req.body;
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const groupIdParam = session.success_url.split('?')[1];
        const groupId = groupIdParam.split('&').find((param: string) => param.startsWith('groupId=')).split('=')[1];
        const updatedGroup = await Group.findByIdAndUpdate(groupId, { $set: { upgraded: true } }).populate('created_by')
        const createdBy = updatedGroup?.created_by as UserDoc
        sendEmail(createdBy.email, `Upgraded ${updatedGroup?.name} successfully`, `Hello! Your payment to upgrade to Twezimbe Premium was received. You can now enjoy all premium features!`);
        res.status(200).json({ url: session.success_url });
    }
})


export const handleGroupSuspension = asyncWrapper(async (req, res) => {
    const { groupId } = req.params
    const group = await Group.findById(groupId).populate('created_by')
    if (!group) return res.status(404).json({ status: false, message: "Group was not found" })
    const updatedGroup = await Group.findByIdAndUpdate(group?._id, {
        $set: {
            suspended: !group.suspended
        }
    }, { new: true })

    const created_by = group?.created_by as UserDoc
    sendEmail(
        `${created_by?.email}`,
        `${updatedGroup?.suspended ? "Group suspended" : "Group reactivated"}`,
        `Dear ${created_by?.firstName} ${created_by?.lastName}, your group ${group?.name} have been ${updatedGroup?.suspended ? "Suspended" : "reactivated"} by system admins.`
    )
    res.status(200).json(
        {
            status: true,
            message: `group ${updatedGroup?.suspended ? "suspended" : "unsuspended"} successfully`,
            group: updatedGroup
        }
    )
})

