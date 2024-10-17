import { v2 as cloudinary } from 'cloudinary';
import "dotenv/config";
import express, { Request, Response } from 'express';
import Database from './services/Database';
import ExpressServer from './services/ExpressServer';
import passport from 'passport';
import './services/passport.strategies'
import session from 'express-session'
import { GenerateToken } from './utils/password.utils';
import { config } from 'dotenv';
config()
export const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require("cors");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const StartServer = async () => {

    const app = express();
    const corsOptions = {
        origin: '*',
    };
    app.use(cors(corsOptions))
    app.options('*', cors(corsOptions));
    await Database();
    await ExpressServer(app);

    app.use(express.json({ limit: '5mb' }));
    app.use(express.urlencoded({ limit: '5mb', extended: true }));

    app.use(session({
        resave: false, saveUninitialized: true, secret: process.env.SESSION_SECRET || 'my-secret'
    }))


    app.use(passport.initialize())
    app.use(passport.session());

    passport.serializeUser(function (user, cb) {
        cb(null, user);
    });

    passport.deserializeUser(function (user: any, cb) {
        cb(null, user);
    })

    app.get('/api/v1/auth/google', passport.authenticate("google", { scope: ['profile', 'email'] }))
    app.get('/api/v1/auth/google/callback', passport.authenticate('google', { failureRedirect: '/api/v1/auth/google' }), async (req, res, next) => {

        const token = await GenerateToken({
            _id: req.user?._id || '',
            email: req.user?.email || '',
            verified: req.user?.verified || false
        });
        res.redirect(`${process.env.FRONTEND_URL}?token=${token}&user=${req.user}`)
    })


    app.get('/api/v1/auth/facebook', passport.authenticate("facebook", { scope: ['public_profile', 'email'] }))
    app.get('/api/v1/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/api/v1/auth/facebook' }), async (req, res, next) => {

        const token = await GenerateToken({
            _id: req.user?._id || '',
            email: req.user?.email || '',
            verified: req.user?.verified || false
        });
        res.redirect(`${process.env.FRONTEND_URL}?token=${token}&user=${req.user}`)
    })


    app.all('*', (req: Request, res: Response) => {
        res.status(404).json({ errors: 'Route Not Found' });
    })


    app.listen(process.env.PORT || 3001, () => console.log('Server is running on port 3001'));
};

StartServer();