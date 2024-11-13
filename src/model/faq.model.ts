import mongoose, { Document, Schema } from 'mongoose';

interface IFaq extends Document {
    question: string;
    answer: string;
}

const FaqSchema = new Schema<IFaq>({
    question: { type: String, required: true },
    answer: { type: String, required: true },
}, {
    timestamps: true
}
);

const Faq = mongoose.model<IFaq>('Faq', FaqSchema);
export default Faq;
