import express from 'express';
import { forgotPassword, getUserProfile, regenerateOTP, resetPassword, signIn, signUp, updateAccount, uploadProfilePicture, verifyOTP, verifyToken } from '../controller';
import { validateEmail, validateOTP, validatePasswordReset, validateUpdateUserInfo, validateUserSignIn, validateUserSignUp } from '../utils/userValidation';
import passport from 'passport';
import { upload } from '../utils/multer';
const userRouter = express.Router();

userRouter.post('/signup', validateUserSignUp, signUp);
userRouter.post('/signin', validateUserSignIn, signIn);
userRouter.get('/user', getUserProfile);
userRouter.post('/verify', validateOTP, verifyOTP);
userRouter.post('/regenerateOtp', regenerateOTP);
userRouter.post('/forgotPassword', validateEmail, forgotPassword);
userRouter.post('/resetPassword', validatePasswordReset, resetPassword);
userRouter.put('/update', validateUpdateUserInfo, updateAccount);
userRouter.get('/validate', verifyToken);
userRouter.post('/user/upload-profile-picture', upload.single('profile_pic'), uploadProfilePicture)
// userRouter.get('/facebook', passport.authenticate("facebook"))
// userRouter.get('/google', passport.authenticate("google", { scope: ['profile', 'email'] }))
// userRouter.get('/google/callback', passport.authenticate('google', { failureRedirect: '/api/v1/auth/google' }), async (req, res, next) => {
//     res.redirect(`${process.env.FRONTEND_URL}?user=${JSON.stringify(req.user)}`)
// })


// socials authentication


export default userRouter; 