import { Document, model, Schema } from "mongoose";

interface UserDoc extends Document {
    googleId: string;
    facebookId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    birthday: string;
    home_address: string;
    office_address: string;
    primary_interest: string;
    current_challenges: string;
    is_demo: number;
    preferred_date: Date;
    is_active: boolean;
    last_login: Date;
    date_joined: Date;
    del_falg: number;
    verified: boolean;
    salt: string;
    role: "User" | "Manager" | "Admin";
    otp: number;
    otpExpiryTime: Date;
    _doc: UserDoc;
};

const UserSchema = new Schema({
    googleId: {type:String, required:false},
    facebookId: {type:String, required:false},
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    birthday: { type: Date },
    home_address: { type: String },
    office_address: { type: String },
    primary_interest: { type: String },
    current_challenges: { type: String },
    is_demo: { type: Number, default: 0 },
    preferred_date: { type: Date },
    is_active: { type: Boolean, default: false },
    last_login: { type: Date },
    date_joined: { type: Date },
    del_falg: { type: Number, default: 0 },
    salt: { type: String, required: true },
    verified: { type: Boolean, required: true, default: false },
    otp: { type: Number, required: true, },
    otpExpiryTime: { type: Date, required: true, },
    role: {
        type: String,
        required: true,
        enum: {
            values: ['User', 'Manager', 'Admin'],
            message: "Value not allowed as role"
        },
        default: 'User'
    },
}, {
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret.password;
            delete ret.salt;
            delete ret.__v;
        }
    },
    timestamps: true
});

const User = model<UserDoc>("User", UserSchema);
export default User;
