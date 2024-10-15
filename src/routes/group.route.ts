import express from "express";
import { addGroup, getPublicGroups, getJoinedGroupList, getGroupById } from "../controller/group.controller";
const roleRouter = express.Router();

roleRouter.post('/', addGroup);
roleRouter.get('/public', getPublicGroups);
roleRouter.get('/findByUserId', getJoinedGroupList);
// roleRouter.post('/join', joinGroup);
// roleRouter.put('/update', roleUpdate);
roleRouter.get('/:groupId', getGroupById)

export default roleRouter;