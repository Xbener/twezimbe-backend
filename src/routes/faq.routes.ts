import Router from 'express'
import { createFaq, getFaqs, updateFaq } from '../controller/faq.controller'

const router = Router()

router.post('/', createFaq)
router.get('/', getFaqs)
router.put('/:faqId', updateFaq)

export default router