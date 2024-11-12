import { Router } from "express";
import { addTransaction, deleteTransaction, getAllTransactions } from "../controller/transaction.controller";

const router = Router()

router.post('/', addTransaction)
router.get('/', getAllTransactions)
router.delete('/:transactionId', deleteTransaction)
export default router