import express from 'express';
import { forgotPassword, getAllUsers, generate2FASecret, getUserProfile, regenerateOTP, resetPassword, signIn, signUp, updateAccount, uploadProfilePicture, verify2FAToken, verifyOTP, verifyToken, updateActiveStatus, adminSignIn, deleteUserAccount, handleSuspension, updatePassword, getUserData, createUserWallet } from '../controller';
import { validateChangePassword, validateEmail, validateOTP, validatePasswordReset, validateUpdateUserInfo, validateUserSignIn, validateUserSignUp } from '../utils/userValidation';
import passport from 'passport';
import { upload } from '../utils/multer';
const userRouter = express.Router();

userRouter.post('/wallets', createUserWallet)
userRouter.get('/user-to-update/:userId', getUserData)
userRouter.put('/passwords', validateChangePassword, updatePassword)
userRouter.put("/suspend/:userId", handleSuspension)
userRouter.delete('/:userId', deleteUserAccount)
userRouter.post('/status', updateActiveStatus)
userRouter.post('/signup', validateUserSignUp, signUp);
userRouter.post('/signin', validateUserSignIn, signIn);
userRouter.post('/admin/signin', validateUserSignIn, adminSignIn)
userRouter.get('/user', getUserProfile);
userRouter.get('/users', getAllUsers);
userRouter.post('/verify', validateOTP, verifyOTP);
userRouter.post('/regenerateOtp', regenerateOTP);
userRouter.post('/forgotPassword', validateEmail, forgotPassword);
userRouter.post('/resetPassword', validatePasswordReset, resetPassword);
userRouter.put('/update/:userId', validateUpdateUserInfo, updateAccount);
userRouter.get('/validate', verifyToken);
userRouter.post('/user/upload-profile-picture', upload.single('profile_pic'), uploadProfilePicture)
// userRouter.get('/facebook', passport.authenticate("facebook"))
// userRouter.get('/google', passport.authenticate("google", { scope: ['profile', 'email'] }))
// userRouter.get('/google/callback', passport.authenticate('google', { failureRedirect: '/api/v1/auth/google' }), async (req, res, next) => {
//     res.redirect(`${process.env.FRONTEND_URL}?user=${JSON.stringify(req.user)}`)
// })


// 2FA

userRouter.get('/2fa/setup', generate2FASecret)
userRouter.post('/2fa/verify', verify2FAToken)

export default userRouter; 