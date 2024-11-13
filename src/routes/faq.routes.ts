import Router from 'express'
import { createFaq, deleteFaq, getFaqs, updateFaq } from '../controller/faq.controller'

const router = Router()

router.post('/', createFaq)
router.get('/', getFaqs)
router.put('/:faqId', updateFaq)
router.delete('/:faqId', deleteFaq)
export default router