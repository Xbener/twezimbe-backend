import express from "express";
import { addGroup, getPublicGroups, getJoinedGroupList, getGroupById, joinGroup, leaveGroup, deleteGroup, updateGroupPicture, updateGroup, RequestToJoinGroup, getGroupRequests, declineRequest, acceptRequest, upgradePlan, captureWebHook, getGroupMembers, getAllGroups, handleGroupSuspension } from "../controller/group.controller";
import { upload } from "../utils/multer";
import { roleUpdate } from "../controller";
const roleRouter = express.Router();


roleRouter.put('/suspend/:groupId', handleGroupSuspension)
roleRouter.get('/', getAllGroups)
roleRouter.post('/', addGroup);
roleRouter.get('/public', getPublicGroups);
roleRouter.get('/findByUserId', getJoinedGroupList);
roleRouter.post('/join', joinGroup);
roleRouter.put('/update', updateGroup);
roleRouter.put('/upload-group-picture', upload.single('group_picture'), updateGroupPicture)

roleRouter.post('/requests', RequestToJoinGroup)
roleRouter.delete('/requests', declineRequest)
roleRouter.put('/requests', acceptRequest)
roleRouter.get('/:groupId', getGroupById)
roleRouter.post("/leave/:groupId", leaveGroup)
roleRouter.get('/requests/:groupId', getGroupRequests)


roleRouter.get('/members/:groupId', getGroupMembers)
roleRouter.post('/:groupId', deleteGroup)

// payments

roleRouter.post('/create-checkout-session', upgradePlan)
roleRouter.post('/webhook', captureWebHook)
export default roleRouter;

