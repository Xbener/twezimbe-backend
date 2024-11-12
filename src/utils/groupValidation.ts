import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

const handleValidationErrors = async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array()[0].msg });
    }
    next();
};

export const validGroupCreation = [
    body('name')
        .not()
        .isEmpty()
        .withMessage("Group name is required"),
    body("group_state")
        .not()
        .isEmpty()
        .withMessage("Group state is required"),
    body("group_type")
        .not().
        isEmpty()
        .withMessage("Group type is required"),
    body("description")
        .not()
        .isEmpty()
        .withMessage("Group description is required"),
    handleValidationErrors
]