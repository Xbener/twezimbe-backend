import { ObjectId } from "mongodb";
import { model, Schema } from "mongoose";

const default_group_pic = 'https://res.cloudinary.com/djehh7gum/image/upload/v1729070790/ura0gnomuhpti7sbi79r.png'

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
    group_picture: { type: String, required: true, default: default_group_pic },
    upgraded: { type: Boolean, default: false, required: true },
    isSacco: { type: Boolean, default: false, required: true },
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
