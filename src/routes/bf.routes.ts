import { Router } from "express";
import { createBf, getGroupBf } from "../controller/bf.controller";

const router = Router()

router.post('/', createBf)
router.get('/:groupId', getGroupBf)

export default router