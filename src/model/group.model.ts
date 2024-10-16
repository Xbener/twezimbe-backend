import { ObjectId } from "mongodb";
import { model, Schema } from "mongoose";

const RoleSchema = new Schema({
    name: { type: String, required: true },
    group_type: { type: String, required: true, default: 'Social' },
    group_state: {
        type: String,
        required: true,
        enum: ['Public', 'Private', 'Invite-Only'],
        default: 'Public'
    },
    group_avatar: { type: String, required: true, default: 'default' },
    description: { type: String },
    tags: { type: String },
    invite_link: { type: String, required: false },
    created_by: {
        type: ObjectId,
        ref: 'User'
    },
    del_flag: { type: Number, default: 0 },
}, {
    timestamps: true
});

const Group = model("Group", RoleSchema);
export default Group;
