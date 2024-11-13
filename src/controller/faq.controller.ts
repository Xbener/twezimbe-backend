import { Request, Response } from 'express';
import Faq from '../model/faq.model';
import mongoose from 'mongoose';

export const createFaq = async (req: Request, res: Response): Promise<Response> => {
    const { question, answer } = req.body;

    try {
        const newFaq = new Faq({ question, answer });
        await newFaq.save();

        return res.status(201).json(newFaq);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to create FAQ' });
    }
}

export const getFaqs = async (req: Request, res: Response): Promise<Response> => {
    try {
        const faqs = await Faq.find({});
        return res.status(200).json({ status: true, faqs });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to retrieve FAQs' });
    }
};

export const updateFaq = async (req: Request, res: Response): Promise<Response> => {
    const { faqId } = req.params;
    const { question, answer } = req.body;

    try {
        const faq = await Faq.findByIdAndUpdate(
            faqId,
            { question, answer },
            { new: true }
        );
        if (!faq) {
            return res.status(404).json({ error: 'FAQ not found' });
        }

        return res.status(200).json({ status: true, faq, message: "FAQ updated successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to update FAQ' });
    }
};
