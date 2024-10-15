import { NextFunction, Request, Response } from "express";
import asyncWrapper from "../middlewares/AsyncWrapper";
import RoleModel from "../model/role.model";
import { Token } from "../model/token.model";
import UserModel from "../model/user.model";
import RoleUser from "../model/user_role";
import { GenerateOTP, sendEmail } from "../utils/notification.utils";
import { GeneratePassword, GenerateSalt, GenerateToken, ValidatePassword, ValidateToken, isTokenValid } from "../utils/password.utils";

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

    // Record account
    const recordedUser = await UserModel.create(req.body);

    var emailMessageBody = '';
    if (recordedUser.role === 'Manager') {
        emailMessageBody = `Hello ${recordedUser.lastName},\n\nYour OTP is ${otp}. \n\nClick on the link bellow to validate your account: \n${process.env.FRONTEND_URL}/manager/auth/verifyotp?id=${recordedUser._id}.\n\nBest regards,\n\nTwezimbe`;
    } else if (recordedUser.role === 'Admin') {
        emailMessageBody = `Hello ${recordedUser.lastName},\n\nYour OTP is ${otp}. \n\nClick on the link bellow to validate your account: \n${process.env.FRONTEND_URL}/admin/auth/verifyotp?id=${recordedUser._id}.\n\nBest regards,\n\nTwezimbe`;
    } else {
        emailMessageBody = `Hello ${recordedUser.lastName},\n\nYour OTP is ${otp}. \n\nClick on the link bellow to validate your account: \n${process.env.FRONTEND_URL}/verifyotp?id=${recordedUser._id}.\n\nBest regards,\n\nTwezimbe`;
    }

    // Send email
    if (recordedUser) {
        await sendEmail(req.body.email, "Verify your account", emailMessageBody);
    }

    //save user_role

    const userRole = await RoleModel.findOne({ role_name: 'User' });

    const roleUser = await RoleUser.create({ role_id: userRole?._id, user_id: recordedUser._id })
    console.log("role_user", roleUser);

    // Send response
    res.status(200).json({ message: "Account created!" });
});


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

    if (!existingUser.verified) {
        return res.status(400).json({ message: "Please verify your account first" });
    }

    const token = await GenerateToken({
        _id: existingUser._id,
        email: existingUser.email,
        verified: existingUser.verified
    });

    const { password: hashedPassword, salt, otp, otpExpiryTime, verified, ...rest } = existingUser._doc;

    // Send response
    res
        .cookie("access-token", token, { httpOnly: true, expires: new Date(Date.now() + 3600000) })
        .status(200)
        .json({ message: "Sign in successful", token });
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

    const token = await GenerateToken({
        _id: existingUser._id,
        email: existingUser.email,
        verified: existingUser.verified
    });

    const { password: hashedPassword, salt, otp, otpExpiryTime, verified, ...rest } = existingUser._doc;

    // Send response
    res
        .cookie("access-token", token, { httpOnly: true, expires: new Date(Date.now() + 3600000) })
        .status(200)
        .json(rest);
});


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
    await sendEmail(foundUser.email, "Verify your account", `Hello ${foundUser.lastName},\n\nYour OTP is ${otp}. \n\nClick on the link bellow to validate your account: \n${process.env.FRONTEND_URL}/verifyotp?id=${foundUser._id}\n\nBest regards,\n\nTwezimbe`);

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


export const updateAccount = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const isTokenValid = await ValidateToken(req);
    if (!isTokenValid) {
        return res.status(400).json({ message: "Access denied" });
    };

    await UserModel.findByIdAndUpdate(req.user?._id, {
        $set: {
            ...req.body
        },
        new: true
    });

    const updatedUser = await UserModel.findById(req.user?._id);

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