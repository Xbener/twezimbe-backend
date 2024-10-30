import { Router } from "express";
import { createBf, getBfMembers, getGroupBf, updateBfUser } from "../controller/bf.controller";

const router = Router()

router.get('/members/:bf_id', getBfMembers)
router.post('/', createBf)
router.get('/:groupId', getGroupBf)
router.put('/user', updateBfUser)

export default router