import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import path from 'path';
import ErrorHandlerMiddleware from '../middlewares/ErrorHandler';
import productRouter from '../routes/application.routes';
import roleRouter from '../routes/role.routes';
import userRouter from '../routes/user.routes';

export default async (app: Application) => {
    app.use(express.json());
    app.use('/images', express.static(path.join(__dirname, '../images')));
    
    app.use(cors({
        origin: [process.env.CLIENT_URL as string],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
    }));

    app.get("/health", async(req: Request, res: Response ) => {
        res.send({
            message: "Health OK!"
        });
    });

    app.use('/api/v1/auth', userRouter);
    app.use('/api/v1/product', productRouter);
    app.use('/api/v1/role', roleRouter);

    app.use(ErrorHandlerMiddleware);

    return app;
}