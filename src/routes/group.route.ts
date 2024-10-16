import express from "express";
import { addGroup, getPublicGroups, getJoinedGroupList, getGroupById, joinGroup, updateGroupPicture } from "../controller/group.controller";
import { upload } from "../utils/multer";
const roleRouter = express.Router();

roleRouter.post('/', addGroup);
roleRouter.get('/public', getPublicGroups);
roleRouter.get('/findByUserId', getJoinedGroupList);
roleRouter.post('/join', joinGroup);
// roleRouter.put('/update', roleUpdate);
roleRouter.get('/:groupId', getGroupById)
roleRouter.put('/upload-group-picture', upload.single('group_picture'), updateGroupPicture)
export default roleRouter;