import { ObjectId } from "mongodb";
import { model, Schema } from "mongoose";

// const default_group_pic = 'https://res.cloudinary.com/djehh7gum/image/upload/v1729070790/ura0gnomuhpti7sbi79r.png'

export interface GroupDoc extends Document {
    name: string;
    group_type: string;
    group_state: string;
    description: string;
    tags: string;
    invite_link: string;
    _id: string;
    suspended: boolean
}

const RoleSchema = new Schema({
    name: { type: String, required: true },
    group_type: { type: String, required: true, default: 'Social' },
    group_state: {
        type: String,
        required: true,
        enum: ['Public', 'Private', 'Invite-Only'],
        default: 'Public'
    },
    description: { type: String },
    tags: { type: String },
    invite_link: { type: String, required: false },
    group_picture: { type: String, required: false, default: "" },
    upgraded: { type: Boolean, default: false, required: true },
    isSacco: { type: Boolean, default: false, required: true },
    has_bf: { type: Boolean, default: false, required: true },
    memberCount: { type: Number, required: true, default: 1 },
    suspended: { type: Boolean, required: true, default: false },
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
