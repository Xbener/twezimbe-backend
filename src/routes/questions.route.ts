import { Router } from "express";
import { answerQuestion, createQuestion, deleteQuestion, getAllQuestions } from "../controller/questions.controller";

const router = Router()

router.get('/', getAllQuestions)
router.post('/', createQuestion)
router.delete('/:questionId', deleteQuestion)
router.put('/:questionId', answerQuestion)

export default router