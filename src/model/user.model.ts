import { Document, model, Schema } from "mongoose";
import UserSettings from '../model/user_settings.model'
const default_profile_pic = "https://res.cloudinary.com/djehh7gum/image/upload/v1729056803/k6eviapycaxss3e12v5e.png";

export interface UserDoc extends Document {
    profileID: string;
    title?: "Mr." | "Ms." | "Mrs." | "Dr." | "Prof.";
    email: string;
    password: string;
    wallet?: string;
    firstName: string;
    lastName: string;
    gender?: "Male" | "Female" | "Other";
    religion?: string;
    place_of_birth?: string;
    current_parish?: string;
    birthday: string;
    national_id_number?: string;
    national_id_photo?: string;
    phone: string;
    home_address?: string;
    home_location_map?: string;
    district_of_birth?: string;
    parish_of_birth?: string;
    village_of_birth?: string;
    marital_status?: "Single" | "Married" | "Divorced" | "Widowed";
    occupation?: string;
    job_title?: string;
    next_of_kin?: {
        national_id_link?: string;
        name?: string;
        phone?: string;
        email?: string;
    };
    monthly_income_level?: "Less than UGX 1,000,000" | "UGX 1,000,000 - 5,000,000" | "UGX 5,000,000 - 15,000,000" | "Above UGX 15,000,000";
    bank_name?: string;
    bank_account_number?: string;
    bank_mobile_account?: string;
    bank_email?: string;
    highest_education_level?: "Secondary (Ordinary Level)" | "Secondary (Advanced Level)" | "Tertiary" | "University" | "Other (Specify)";
    employment_status?: "Employed" | "Self-employed" | "Unemployed" | "Retired";
    current_work_address?: string;
    employer_name?: string;
    current_salary?: string;
    side_hustle_income?: string;
    profile_pic?: string;
    is_demo: number;
    is_active: boolean;
    last_login: Date;
    date_joined: Date;
    del_falg: number;
    verified: boolean;
    otp: number;
    otpExpiryTime: Date;
    salt: string;
    _doc: UserDoc;
    suspended: boolean;
    role: "User" | "Manager" | "Admin" | string;
    securityQuestions?: {
        question: string;
        answer: string;
    }[];
    two_factor_secret: string;
    is_complete: boolean;
    socketId?: string;
    userId: Schema.Types.ObjectId
    active_status?: 'online' | 'offline' | 'do not disturb' | 'idle'
}

const UserSchema = new Schema<UserDoc>({
    title: {
        type: String,
        enum: ["Mr.", "Ms.", "Mrs.", "Dr.", "Prof."],
        required: false,
    },
    email: { type: String, required: true },
    profileID: { type: String, required: false },
    password: { type: String, required: false },
    firstName: { type: String, required: true },
    wallet: { type: String, required: true },
    lastName: { type: String, required: true },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        required: false
    },
    religion: { type: String, required: false },
    place_of_birth: { type: String, required: false },
    current_parish: { type: String, required: false },
    birthday: { type: String, required: false },
    national_id_number: { type: String, required: false },
    national_id_photo: { type: String, required: false },
    phone: { type: String, required: false },
    home_address: { type: String, required: false },
    home_location_map: { type: String, required: false },
    district_of_birth: { type: String, required: false },
    parish_of_birth: { type: String, required: false },
    village_of_birth: { type: String, required: false },
    marital_status: {
        type: String,
        enum: ["Single", "Married", "Divorced", "Widowed"],
        required: false,
    },
    occupation: { type: String, required: false },
    job_title: { type: String, required: false },
    next_of_kin: {
        national_id_link: { type: String, required: false },
        name: { type: String, required: false },
        phone: { type: String, required: false },
        email: { type: String, required: false },
    },
    monthly_income_level: {
        type: String,
        enum: [
            "Less than UGX 1,000,000",
            "UGX 1,000,000 - 5,000,000",
            "UGX 5,000,000 - 15,000,000",
            "Above UGX 15,000,000",
        ],
        required: false,
    },
    bank_name: { type: String, required: false },
    bank_account_number: { type: String, required: false },
    bank_mobile_account: { type: String, required: false },
    bank_email: { type: String, required: false },
    highest_education_level: {
        type: String,
        enum: [
            "Secondary (Ordinary Level)",
            "Secondary (Advanced Level)",
            "Tertiary",
            "University",
            "Other (Specify)",
        ],
        required: false,
    },
    employment_status: {
        type: String,
        enum: ["Employed", "Self-employed", "Unemployed", "Retired"],
        required: false,
    },
    current_work_address: { type: String, required: false },
    employer_name: { type: String, required: false },
    current_salary: { type: String, required: false },
    side_hustle_income: { type: String, required: false },
    profile_pic: { type: String, required: true, default: default_profile_pic },
    is_demo: { type: Number, default: 0 },
    is_active: { type: Boolean, default: false },
    last_login: { type: Date, required: false },
    date_joined: { type: Date, default: Date.now },
    del_falg: { type: Number, default: 0 },
    verified: { type: Boolean, required: true, default: false },
    otp: { type: Number, required: true },
    suspended: { type: Boolean, required: true, default: false },
    otpExpiryTime: { type: Date, required: true },
    salt: { type: String, required: false },
    active_status: { type: String, enum: ['online', 'offline', 'do not disturb', 'idle'], default: 'online' },
    role: {
        type: String,
        enum: ["User", "Manager", "Admin"],
        default: "User",
    },
    securityQuestions: [
        {
            question: { type: String, required: false },
            answer: { type: String, required: false },
        }
    ],
    two_factor_secret: {
        type: String, required: false
    },
    is_complete: {
        type: Boolean, required: true, default: false
    }
}, {
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.password;
            delete ret.salt;
        }
    },
    timestamps: true
});

UserSchema.path('securityQuestions').default([
    { question: "What was the name of your first pet?", answer: "" },
    { question: "What is the name of the street you grew up on?", answer: "" }
]);

UserSchema.post('save', async function (doc) {
    if (doc.isNew) { // Only create settings for new users
        try {
            await UserSettings.create({
                userId: doc._id,
                notificationSettings: {
                    chatroomsMuted: [],
                    notifyOnMention: true,
                    notifyOnDirectMessage: true,
                    notifyOnReaction: false,
                    notifyOnOtherEvents: false
                }
            });
        } catch (error) {
            console.error("Error creating user settings:", error);
        }
    }
});


const User = model<UserDoc>("User", UserSchema);
export default User;
