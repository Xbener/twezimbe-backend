import { Router } from "express";
import { addNewBfMember, applyToJoinBF, createBf, getBfJoinRequests, getBfMembers, getGroupBf, updateBfUser } from "../controller/bf.controller";

const router = Router()

router.post('/requests', applyToJoinBF)
router.get('/requests/:bf_id', getBfJoinRequests)
router.get('/members/:bf_id', getBfMembers)
router.post('/members', addNewBfMember)
router.post('/', createBf)
router.get('/:groupId', getGroupBf)
router.put('/user', updateBfUser)

export default router