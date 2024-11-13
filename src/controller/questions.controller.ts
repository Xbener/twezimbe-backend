import asyncWrapper from '../middlewares/AsyncWrapper'
import Question from '../model/questions.model'
import User from '../model/user.model'
import { sendEmail } from '../utils/notification.utils'

export const getAllQuestions = asyncWrapper(async (req, res) => {
    const questions = await Question.find({}).sort({ createdAt: -1 })
    res.status(200).json({ status: true, questions })
})

export const createQuestion = asyncWrapper(async (req, res) => {
    const newQuestion = await Question.create(req.body)
    const admins = await User.find({ role: "Admin" })
    if (admins.length) {
        admins.forEach((admin) => {
            sendEmail(`${admin.email}`, "You have a new message", `${req.body.fullName} has sent you a message. Check admin dashboard for more.`)
        })
    }
    return res.status(201).json(
        {
            message: "Message submitted successfully. Admins will get to you shortly."
        }
    )
})

export const deleteQuestion = asyncWrapper(async (req, res) => {
    await Question.findByIdAndDelete(req.params.questionId)
    return res.status(200).json({
        status: true,
        message: "Inquiry removed successfully"
    })
})

export const answerQuestion = asyncWrapper(async (req, res) => {
    if (!req.body.answer) return res.status(400).json({ status: false, message: "Please provide an answer" })
    const updatedQuestion = await Question.findByIdAndUpdate(req.params.questionId, {
        $set: {
            response: req.body.answer,
            responded: true
        }
    }, { new: true })

    sendEmail(`${updatedQuestion?.email}`, "Twezimbe admins have answered your message", `${updatedQuestion?.response}`)
    res.status(200).json(
        {
            status: true,
            message: "Response sent",
            question: updatedQuestion
        }
    )
})