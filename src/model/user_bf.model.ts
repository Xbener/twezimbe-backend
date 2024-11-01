import mongoose, { Schema, model } from 'mongoose'


const BfUserSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    bf_id: { type: Schema.Types.ObjectId, ref: 'Bf', required: true },
    role: {
        type: [String],
        enum: [
            'admin',
            'supervisor',
            'hr',
            'manager',
            'coordinator',
            'counselor',
            'principal',
            'beneficiary'
        ], required: true,
        default: "principal"
    }
}, {
    timestamps: true
})


export default model('Bf_user', BfUserSchema)