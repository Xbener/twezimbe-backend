import mongoose, { Schema, model } from 'mongoose'

const QuestionSchema = new Schema(
    {
        fullName: { type: String, required: true },
        email: { type: String, required: true },
        message: { type: String, required: true },
        response: { type: String, required: false },
        responded: { type: Boolean, required: true, default: false }
    }
    , {
        timestamps: true
    })


export default model('Question', QuestionSchema)