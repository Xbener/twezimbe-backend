import passport from 'passport'
import { OAuth2Strategy as GoogleStrategy } from 'passport-google-oauth'
import { Strategy as FacebookStrategy } from 'passport-facebook'
import UserModel from "../model/user.model";
import RoleModel from "../model/role.model";
import UserRole from "../model/user_role"
import { GenerateOTP, sendEmail } from '../utils/notification.utils';
import RoleUser from '../model/user_role';
import { GenerateSalt } from '../utils/password.utils';



const facebookStrategy = new FacebookStrategy({
    clientID: process.env['FACEBOOK_CLIENT_ID'] || '',
    clientSecret: process.env['FACEBOOK_CLIENT_SECRET'] || '',
    callbackURL: `${process.env.BACKEND_URL}/api/v1/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'photos', 'email'],
    enableProof: true
    // state: true
}, async function (accessToken: string, refreshToken: string, profile: any, cb: (n: any, p: any) => void) {

    const existingUser = await UserModel.findOne({ email: profile._json.email });
    if (existingUser && existingUser.del_falg === 1) {
        return cb("Account not found", null);
    }
    if (existingUser?.suspended) return cb("Account suspended. Please contact admins for more info", null)
    if (existingUser) {
        return cb(null, existingUser)
    }

    // Create OTP
    const { otp, expiryDate } = GenerateOTP();
    const salt = await GenerateSalt();



    // Record account
    const recordedUser = await UserModel.create({
        facebookId: profile.id,
        firstName: profile._json.name.split(' ')[0]!,
        lastName: profile._json.name?.split(' ')[1]!,
        email: profile._json.email,
        otp: otp,
        otpExpiryTime: expiryDate,
        phone: "",
        salt: salt,
        password: "",
        profile_picture: profile.photos[0]!.value
    });

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
        sendEmail(profile._json.email, "Verify your account", emailMessageBody);
    }

    //save user_role

    const userRole = await RoleModel.findOne({ role_name: 'User' });

    const roleUser = await RoleUser.create({ role_id: userRole?._id, user_id: recordedUser._id })

    return cb(null, recordedUser)
})


const googleStrategy = new GoogleStrategy({
    callbackURL: `${process.env.BACKEND_URL}/api/v1/auth/google/callback`,
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
}, async function (accessToken, refreshToken, profile, cb) {

    const existingUser = await UserModel.findOne({ email: profile._json.email });
    if (existingUser && existingUser.del_falg === 1) {
        return cb("Account not found", null);
    }
    if (existingUser?.suspended) return cb("Account suspended. Please contact admins for more info", null)
    if (existingUser) {
        return cb(null, existingUser)
    }

    // Create OTP
    const { otp, expiryDate } = GenerateOTP();
    const salt = await GenerateSalt();


    // Record account
    const recordedUser = await UserModel.create({
        googleId: profile.id,
        firstName: profile._json.family_name,
        lastName: profile._json.given_name,
        email: profile._json.email,
        otp: otp,
        otpExpiryTime: expiryDate,
        phone: "",
        salt: salt,
        password: "",
        profile_picture: profile._json.picture
    });

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
        sendEmail(profile._json.email, "Verify your account", emailMessageBody);
    }

    //save user_role

    const userRole = await RoleModel.findOne({ role_name: 'User' });

    const roleUser = await RoleUser.create({ role_id: userRole?._id, user_id: recordedUser._id })

    return cb(null, recordedUser)
})

passport.use(facebookStrategy)
passport.use(googleStrategy)