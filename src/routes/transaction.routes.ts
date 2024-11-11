import { Router } from "express";
import { addTransaction, getAllTransactions } from "../controller/transaction.controller";

const router = Router()

router.post('/', addTransaction)
router.get('/', getAllTransactions)

export default router