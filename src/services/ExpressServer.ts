import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import path from 'path';
import ErrorHandlerMiddleware from '../middlewares/ErrorHandler';
import productRouter from '../routes/application.routes';
import roleRouter from '../routes/role.routes';
import userRouter from '../routes/user.routes';
import GroupsRouter from '../routes/group.route'
import channelRouter from '../routes/channel.routes';
import messageRouter from '../routes/message.route'
import chatroomRouter from '../routes/chatroom.routes'
import settingsRouter from '../routes/settings.route'
import BfRouter from '../routes/bf.routes'
import TransactionRouter from '../routes/transaction.routes'
import questionRouter from '../routes/questions.route'
import faqRouter from '../routes/faq.routes'

export default async (app: Application) => {
    app.use(express.json());
    app.use('/images', express.static(path.join(__dirname, '../images')));
    app.use('/uploads', express.static('uploads'));
    app.use(cors({
        origin: [process.env.FRONTEND_URL as string],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
    }));

    app.get("/health", async (req: Request, res: Response) => {
        res.send({
            message: "Health OK!"
        });
    });

    app.use('/api/v1/auth', userRouter);
    app.use('/api/v1/product', productRouter);
    app.use('/api/v1/role', roleRouter);
    app.use('/api/v1/groups', GroupsRouter)
    app.use('/api/v1/channels', channelRouter)
    app.use('/api/v1/messages', messageRouter)
    app.use('/api/v1/chatrooms', chatroomRouter)
    app.use('/api/v1/settings', settingsRouter)
    app.use('/api/v1/bf', BfRouter)
    app.use('/api/v1/transactions', TransactionRouter)
    app.use('/api/v1/questions', questionRouter)
    app.use('/api/v1/faqs', faqRouter)

    app.use(ErrorHandlerMiddleware);


    return app;
}