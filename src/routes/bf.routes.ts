import { Router } from "express";
import { addNewBfMember, createBf, getBfMembers, getGroupBf, updateBfUser } from "../controller/bf.controller";

const router = Router()

router.get('/members/:bf_id', getBfMembers)
router.post('/members', addNewBfMember)
router.post('/', createBf)
router.get('/:groupId', getGroupBf)
router.put('/user', updateBfUser)

export default router