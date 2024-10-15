import express from "express";
import { addGroup, getPublicGroups } from "../controller/group.controller";
const roleRouter = express.Router();

roleRouter.post('/', addGroup);
roleRouter.get('/public', getPublicGroups);
// roleRouter.get('/findByUserId', getJoinedGroupList);
// roleRouter.post('/join', joinGroup);
// roleRouter.put('/update', roleUpdate);

export default roleRouter;