import { NextFunction, Request, Response } from "express";
import asyncWrapper from "../middlewares/AsyncWrapper";
import RoleModel from "../model/role.model";
import { Token } from "../model/token.model";
import UserModel from "../model/user.model";
import RoleUser from "../model/user_role";
import { GenerateOTP, sendEmail } from "../utils/notification.utils";
import { GeneratePassword, GenerateSalt, GenerateToken, ValidatePassword, ValidateToken, isTokenValid } from "../utils/password.utils";
import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'
import moment from "moment";
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import messagesModel from "../model/messages.model";
import user_bfModel from "../model/user_bf.model";
import UserGroup from "../model/user_group.model";
import UserSettings from "../model/user_settings.model";
import beneficiaryModel from "../model/beneficiary.model";
import principalModel from "../model/principal.model";
import mongoose from "mongoose";
import bf_requestsModel from "../model/bf_requests.model";
import walletModel from "../model/wallet.model";
import User from "../model/user.model";
import { generateWallet } from "../utils/generateWallet";

export const signUp = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    // Check existing email
    const existingUser = await UserModel.findOne({ email: req.body.email });
    if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
    };
    const salt = await GenerateSalt();
    req.body.password = await GeneratePassword(req.body.password, salt);

    // Create OTP
    const { otp, expiryDate } = GenerateOTP();
    req.body.otp = otp;
    req.body.salt = salt;
    req.body.otpExpiryTime = expiryDate;


    if (req.body.role === 'Manager') {
        req.body.verified = true;
    }

    // generateWallet
    const lastPersonWithWallet = await User.findOne({}).sort({ createdAt: -1 });
    let walletCode = "00001"
    if (lastPersonWithWallet) {
        // Extract the last group code and increment it
        const lastWalletcode = parseInt(lastPersonWithWallet._id.toString().slice(4, 9));
        walletCode = (lastWalletcode + 1).toString().padStart(5, '0');
    }
    const recordedUser = await UserModel.create(req.body);
    const walletAddress = await generateWallet(walletCode, recordedUser._id, "User")
    await User.findByIdAndUpdate(recordedUser._id, { wallet: walletAddress })
    var emailMessageBody = '';
    if (recordedUser.role === 'Manager') {
        emailMessageBody = `Hello ${recordedUser.lastName},\n\nYour OTP is ${otp}. \n\nClick on the link bellow to validate your account: \n${process.env.FRONTEND_URL}/manager/auth/verifyotp?id=${recordedUser._id}.\n\nBest regards,\n\nTwezimbe`;
    } else if (recordedUser.role === 'Admin') {
        emailMessageBody = `Hello ${recordedUser.lastName},\n\nYour OTP is ${otp}. \n\nClick on the link bellow to validate your account: \n${process.env.FRONTEND_URL}/admin/auth/verifyotp?id=${recordedUser._id}.\n\nBest regards,\n\nTwezimbe`;
    } else {
        emailMessageBody = `Hello ${recordedUser.lastName},\n\nYour OTP is ${otp}. \n\nClick on the link bellow to validate your account: \n${process.env.FRONTEND_URL}/public_pages/ValidateOTP?id=${recordedUser._id}.\n\nBest regards,\n\nTwezimbe`;
    }

    // Send email
    if (recordedUser) {
        await sendEmail(req.body.email, "Verify your account", emailMessageBody);
    }

    //save user_role

    const userRole = await RoleModel.findOne({ role_name: 'User' });

    const roleUser = await RoleUser.create({ role_id: userRole?._id, user_id: recordedUser._id })

    // Send response
    res.status(200).json({ message: "Account created!", user: recordedUser });
});


export const adminSignIn = asyncWrapper(async (req: Request, res: Response) => {
    // Check existing email
    const existingUser = await UserModel.findOne({ email: req.body.email });
    if (!existingUser) {
        return res.status(400).json({ message: "Invalid email or password" });
    };

    // Check password
    const isPasswordValid = await ValidatePassword(req.body.password, existingUser.password, existingUser.salt);
    if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid email or password" });
    };

    if (existingUser.role !== 'Admin') return res.status(401).json({ status: false, message: "you are not authorized to access this page" })
    const token = await GenerateToken({
        _id: existingUser._id,
        email: existingUser.email,
        verified: existingUser.verified,
        role: existingUser?.role
    });

    const { password: hashedPassword, salt, otp, otpExpiryTime, verified, ...rest } = existingUser._doc;

    // Send response
    res
        .cookie("access-token", token, { httpOnly: true, expires: new Date(Date.now() + 3600000) })
        .status(200)
        .json({ message: "Sign in successful", token, rest });

})

export const signIn = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    // Check existing email
    const existingUser = await UserModel.findOne({ email: req.body.email });
    if (!existingUser) {
        return res.status(400).json({ message: "Invalid email or password" });
    };

    // Check password
    const isPasswordValid = await ValidatePassword(req.body.password, existingUser.password, existingUser.salt);
    if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid email or password" });
    };

    // if (!existingUser.verified) {
    //     return res.status(400).json({ message: "Please verify your account first" });
    // }

    if (existingUser?.del_falg === 1) return res.status(403).json({ status: false, message: "Account was not found" })
    if (existingUser.suspended) return res.status(403).json({ status: false, message: "This account was suspended. Please contact admins for more info" })
    const token = await GenerateToken({
        _id: existingUser._id,
        email: existingUser.email,
        verified: existingUser.verified,
        role: existingUser?.role
    });

    const { password: hashedPassword, salt, otp, otpExpiryTime, verified, ...rest } = existingUser._doc;

    // Send response
    res
        .cookie("access-token", token, { httpOnly: true, expires: new Date(Date.now() + 3600000) })
        .status(200)
        .json({ message: "Sign in successful", token, rest });
});

export const getUserProfile = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const authToken = req.get('Authorization');

    if (!authToken?.split(' ')[1]) {
        return res.status(401).json({ message: "Access denied!" });
    }

    const isValid = await isTokenValid(req);
    if (!isValid) {
        return res.status(401).json({ message: "Access denied!" });
    }

    const existingUser = await UserModel.findOne({ email: req.user?.email });

    if (!existingUser) {
        return res.status(400).json({ message: "User not found" });
    }
    const wallet = await walletModel.findOne({ walletAddress: existingUser?.wallet })
    const token = await GenerateToken({
        _id: existingUser._id,
        email: existingUser.email,
        verified: existingUser.verified,
        role: existingUser.role
    });

    const { password: hashedPassword, salt, otp, otpExpiryTime, verified, ...rest } = existingUser._doc;

    // Send response
    res
        .cookie("access-token", token, { httpOnly: true })
        .status(200)
        .json({ ...rest, wallet });
});


export const getUserData = asyncWrapper(async (req: Request, res: Response) => {
    const { userId } = req.params
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ status: false, message: "user was not found" })
    const { ...rest } = user._doc
    const wallet = await walletModel.findOne({ walletAddress: user.wallet }).populate({
        path: 'transactionHistory.user', // Path to populate
        model: 'User', // Ensure this matches the model name
    });
    res.status(200).json({
        status: true,
        user: { ...rest, wallet }
    })
})


export const regenerateOTP = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const foundUser = await UserModel.findById(req.body.id);
    if (!foundUser) {
        return res.status(400).json({ message: "Account with this email is not registered!" });
    };

    // Generate new OTP
    const { otp, expiryDate } = GenerateOTP();

    // Update user info
    foundUser.otp = otp;
    foundUser.otpExpiryTime = expiryDate;
    await foundUser.save();

    // Send email
    await sendEmail(foundUser.email, "Verify your account", `Hello ${foundUser.lastName},\n\nYour OTP is ${otp}. \n\nClick on the link bellow to validate your account: \n${process.env.FRONTEND_URL}/public_pages/ValidateOTP?id=${foundUser._id}\n\nBest regards,\n\nTwezimbe`);

    // Send response
    res.status(200).json({ message: "OTP resent!" });
});


export const verifyOTP = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body);
    const foundUser = await UserModel.findOne({ otp: req.body.otp });

    if (!foundUser) {
        return res.status(400).json({ message: "Invalid OTP" });
    };

    if (new Date(foundUser.otpExpiryTime).getTime() < new Date().getTime()) {
        return res.status(400).json({ message: "OTP expired" });
    };

    foundUser.verified = true;
    const savedUser = await foundUser.save();

    if (savedUser) {
        return res.status(200).json({ message: "User account verified!" });
    }
});


export const forgotPassword = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const foundUser = await UserModel.findOne({ email: req.body.email });
    if (!foundUser) {
        return res.status(400).json({ message: "Account with this email is not registered!" });
    };

    const token = await GenerateToken({
        _id: foundUser._id,
        email: foundUser.email,
        verified: foundUser.verified
    });

    await Token.create({
        token,
        user: foundUser._id,
        expirationDate: new Date().getTime() + (60 * 1000 * 5),
    });

    const link = `${process.env.FRONTEND_URL}/public_pages/resetpassword?token=${token}&id=${foundUser._id}&use=reset-password`
    const emailBody = `Hello ${foundUser.lastName},\n\nClick on the link bellow to reset your password.\n\n${link}\n\nBest regards,\n\nTwezimbe`;

    await sendEmail(foundUser.email, "Reset your password", emailBody);

    res.status(200).json({ message: "We sent you a reset password link on your email!", token });
});


export const resetPassword = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Invalid token" });
    };

    const foundUser = await UserModel.findById(req.user?._id);
    if (!foundUser) {
        return res.status(400).json({ message: "Invalid token" });
    };

    foundUser.password = await GeneratePassword(req.body.password, foundUser.salt);

    await foundUser.save()
    await Token.deleteOne({ user: req.user?._id });

    res.status(200).json({ message: "Your password has been reset!" });
});


const generateProfileID = (national_id_number: string) => {
    const registrationDate = moment().format("DDMM");
    const year = moment().format("YY");

    const personalID = national_id_number
        ? national_id_number.padEnd(14, "0").slice(0, 14)
        : Math.random().toString(36).substring(2, 16).padEnd(14, "0");

    return `${registrationDate}${personalID}${year}`;
};


export const updateAccount = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    };
    const profileID = generateProfileID(req.body.national_id_number!);

    await UserModel.findByIdAndUpdate(req.params.userId, {
        $set: {
            ...req.body,
            profileID,
            is_complete: true
        },
        new: true
    });

    const updatedUser = await UserModel.findById(req.params.userId);
    if (!updatedUser) {
        return res.status(400).json({ message: "User not found" });
    };

    res.status(200).json({ message: "Account info updated successfully!", user: updatedUser });
});

export const verifyToken = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const validToken = await isTokenValid(req);

    if (!validToken) {
        return res.status(400).json({ message: "Access denied" });
    }
    res.status(200).json({ message: "Token is valid" });
});



export const uploadProfilePicture = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    };

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }


    const uploadResult = await cloudinary.uploader.upload(req.file.path);
    console.log(req?.user)

    const userId = req?.user?._id;
    const updatedUser = await UserModel.findByIdAndUpdate(userId, {
        $set: {
            profile_pic: uploadResult.secure_url
        }
    });

    if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
    }

    fs.unlink(req.file.path, (err) => {
        if (err) {
            console.error('Error deleting file:', err);
        }
    });

    res.status(200).json({
        message: 'Profile picture uploaded successfully',
        profilePicUrl: uploadResult.secure_url,
        user: updatedUser,
        status: true
    });
});


export const generate2FASecret = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    };
    const user = await UserModel.findOne({ _id: req?.user?._id })
    if (!user) return res.status(404).json({ errors: "User not found" })
    const secret = speakeasy.generateSecret({
        name: "Twezimbe (webadmin@summitcl.com)",
    });

    // Optionally, you can store this `secret.base32` in your database for the user
    // req?.user?.twoFactorSecret = secret.base32;



    user.two_factor_secret = secret.base32;

    // Generate the QR code for the user to scan
    qrcode.toDataURL(secret.otpauth_url!, (err, dataURL: any) => {
        if (err) {
            return res.status(500).json({ message: "Error generating QR code" });
        }
        res.json({ secret: secret.base32, qrCodeUrl: dataURL });
    });
});


export const verify2FAToken = asyncWrapper(async (req: Request, res: Response) => {

    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    };
    const user = await UserModel.findOne({ _id: req?.user?._id })
    if (!user) return res.status(404).json({ errors: "User not found" })


    const { token } = req.body; // token is the TOTP the user inputs
    const verified = speakeasy.totp.verify({
        secret: user?.two_factor_secret, // retrieve the user's saved 2FA secret
        encoding: 'base32',
        token, // TOTP entered by the user
        window: 1 // window allows for clock drift
    });

    if (verified) {
        res.json({ message: "2FA verification successful!" });
    } else {
        res.status(400).json({ message: "Invalid 2FA token." });
    }
});


export const getAllUsers = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    };

    const users = await UserModel.aggregate([
        {
            $match: {
                del_falg: 0
            }
        },
        {
            $lookup: {
                from: "wallets",
                localField: "wallet",
                foreignField: "walletAddress",
                as: "wallet"
            }
        },
        {
            $unwind: {
                path: "$wallet",
                preserveNullAndEmptyArrays: true
            }
        }
    ]);
    return res.status(200).json({ status: true, users })
})

export const updateActiveStatus = asyncWrapper(async (req, res) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    };

    await UserModel.findByIdAndUpdate(req.body.userId, { $set: { active_status: req.body.status } })
    res.status(200).json({
        status: true,
        activeStatus: req.body.status
    })

})

export const deleteUserAccount = asyncWrapper(async (req, res) => {
    const { userId } = req.params
    // const user = await UserModel.findByIdAndUpdate(userId, {
    //     del_falg: 1
    // }, { new: true })
    // console.log("user updated", user?.id, user?.del_falg)

    await UserModel.findByIdAndDelete(userId)
    await beneficiaryModel.deleteMany({ userId: new mongoose.Types.ObjectId(userId) })
    await user_bfModel.deleteMany({ userId: new mongoose.Types.ObjectId(userId) })
    await bf_requestsModel.deleteMany({ user_id: new mongoose.Types.ObjectId(userId) })
    await walletModel.deleteOne({ ref: new mongoose.Types.ObjectId(userId) })
    await UserSettings.deleteMany({ userId: new mongoose.Types.ObjectId(userId) })
    await UserGroup.deleteMany({ user_id: new mongoose.Types.ObjectId(userId) })
    return res.status(200).json({ status: true })
})


export const handleSuspension = asyncWrapper(async (req, res) => {
    const { userId } = req.params
    const user = await UserModel.findById(userId)
    if (!user) return res.status(404).json({ status: false, message: "User was not found" })
    const updatedUser = await UserModel.findByIdAndUpdate(user?._id, {
        $set: {
            suspended: !user.suspended
        }
    }, { new: true })

    sendEmail(
        `${user.email}`,
        `${updatedUser?.suspended ? "Account suspended" : "Account reactivated"}`,
        `Dear ${updatedUser?.firstName} ${updatedUser?.lastName}, your account have been ${updatedUser?.suspended ? "Suspended" : "reactivated"} by system admins.`
    )
    res.status(200).json(
        {
            status: true,
            message: `user ${updatedUser?.suspended ? "suspended" : "unsuspended"} successfully`,
            user: updatedUser
        }
    )
})


export const updatePassword = asyncWrapper(async (req: Request, res: Response) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    };
    let { oldPassword, newPassword } = req.body
    const user = await User.findOne({ email: req.user?.email })
    if (!user) return res.status(404).json({ status: false, message: "Account not found" })
    if ((!oldPassword || oldPassword === "") && user.password) return res.status(403).json({ status: false, message: "Enter correct password" })

    if (oldPassword && user.password) {
        let comparePassword = await ValidatePassword(oldPassword, user.password, user.salt)
        if (!comparePassword) return res.status(403).json({ status: false, message: "You entered wrong incorrect password" })
    }
    const salt = await GenerateSalt();
    newPassword = await GeneratePassword(newPassword, salt);
    await User.findOneAndUpdate({ email: req.user?.email }, { password: newPassword, salt })

    res.status(200).json({ status: true, message: "Password updated successfully" })
})


export const sendCompleteProfileEmail = asyncWrapper(async (req, res) => {
    const { affectedId, principalId } = req.body
    const affected = await User.findById(affectedId)
    if (!affected) return res.status(404).json({ status: false, message: "Affected person not found" })
    const principal = await User.findById(principalId)
    if (!principal) return res.status(404).json({ status: false, message: "Principal not found" })
    if (affectedId === principalId) {
        sendEmail(`${principal.next_of_kin?.email}`, `Please complete your KYC`, `Dear ${principal.next_of_kin?.name}, As next of kin for ${affected.firstName} ${affected.lastName}, you are required to complete their KYC profile for them so a case can be filed for them.`)
        return res.status(200).json({
            status: true,
            message: "email sent to next of kin"
        })
    }

    sendEmail(`${principal.email}`, "Please complete KYC", "")
    return res.status(200).json(
        {
            status: true,
            message: "Please complete KYC info for the affected person."
        }
    )
})

export const createUserWallet = asyncWrapper(async (req, res) => {
    const { userId } = req.body
    const lastPersonWithWallet = await User.findOne(
        { walletAddress: { $exists: true, $ne: "" } },
        { walletAddress: true }
    ).sort({ createdAt: -1 });
    let walletCode: string | number = "00001"
    if (lastPersonWithWallet?._id) {
        const lastWalletcode = parseInt(lastPersonWithWallet.wallet?.slice(4, 9)!);
        walletCode = lastWalletcode! + 1;
    }
    const walletAddress = await generateWallet(`${walletCode}`, new mongoose.Types.ObjectId(userId), "User")
    await User.findByIdAndUpdate(userId, { wallet: walletAddress })
    res.status(201).json({
        status: true,
        message: "Wallet created successfully",
        walletAddress
    })
})