import { ObjectId } from "mongodb";
import { model, Schema } from "mongoose";


const GroupRequestSchema = new Schema({
    userId: { type: ObjectId, ref: "User", required: true },
    groupId: { type: ObjectId, ref: "Group", required: true }
}, {
    timestamps: true
});

const GroupRequest = model("GroupRequest", GroupRequestSchema);
export default GroupRequest;
