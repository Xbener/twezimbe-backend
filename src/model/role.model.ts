import { model, Schema } from "mongoose";

export interface RoleDoc extends Document {
    role_name: string;
    description: string;
    del_flag:number;
}

const RoleSchema = new Schema({
    role_name: { type: String, required: true },
    description: { type: String },
    del_flag: { type: Number, default: 0},
},{
    timestamps: true
});

const Role = model("Role", RoleSchema);
export default Role;
