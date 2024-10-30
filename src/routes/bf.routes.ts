import { Router } from "express";
import { acceptBfJoinRequest, addNewBfMember, applyToJoinBF, createBf, declineRequest, getBfJoinRequests, getBfMembers, getGroupBf, updateBfUser } from "../controller/bf.controller";

const router = Router()

router.post('/requests/accept', acceptBfJoinRequest)
router.delete('/requests/:requestId', declineRequest)
router.post('/requests', applyToJoinBF)
router.get('/requests/:bf_id', getBfJoinRequests)
router.get('/members/:bf_id', getBfMembers)
router.post('/members', addNewBfMember)
router.post('/', createBf)
router.get('/:groupId', getGroupBf)
router.put('/user', updateBfUser)

export default router