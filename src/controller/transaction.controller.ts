import asyncWrapper from '../middlewares/AsyncWrapper'
import Transaction from '../model/transactions.model'

export const addTransaction = asyncWrapper(async (req, res) => {
    const newTransaction = new Transaction({
        ...req.body
    })

    await newTransaction.save()

    res.status(201).json({
        status: true,
        transaction: newTransaction,
        message: "New transaction added "
    })
})

export const getAllTransactions = asyncWrapper(async (req, res) => {
    const transactions = await Transaction.find({}).sort({ createdAt: 1 }).populate('user')
    res.status(200).json(
        {
            status: true,
            transactions
        }
    )
})

export const deleteTransaction = asyncWrapper(async (req, res) => {

    await Transaction.findByIdAndDelete(req.params.transactionId)
    return res.status(200).json({ status: true })
})