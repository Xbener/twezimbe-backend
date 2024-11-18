import moment from "moment";
import walletModel from "../model/wallet.model"
import mongoose from "mongoose";

export const generateWallet = async (objectCode: string, refId: mongoose.Types.ObjectId, refType: string) => {
    const registrationDate = moment().format("DDMM");
    const lastWallet = await walletModel.findOne({}, { createdAt: -1 })
    let walletCode = "0001";
    if (lastWallet) {
        walletCode = `${lastWallet?.walletAddress?.slice(8) + 1}`
    }
    const walletAddress = `${registrationDate}${objectCode}${walletCode}`
    const newWallet = await walletModel.create({ walletAddress, refType, ref: refId })
    return walletAddress
}