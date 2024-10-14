import express from 'express';
import { forgotPassword, getUserProfile, regenerateOTP, resetPassword, signIn, signUp, updateAccount, verifyOTP, verifyToken } from '../controller';
import { validateEmail, validateOTP, validatePasswordReset, validateUpdateUserInfo, validateUserSignIn, validateUserSignUp } from '../utils/userValidation';
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


export default userRouter;