import moment from "moment";
import walletModel from "../model/wallet.model"
import mongoose from "mongoose";

export const generateWallet = async (objectCode: string, refId: mongoose.Types.ObjectId, refType: string) => {
    const registrationDate = moment().format("DDMM");
    const lastWallet = await walletModel.findOne({}, null).sort({ createdAt: -1 });
    let walletCode: string | number = "0001";
    if (lastWallet) {
        walletCode = parseInt(lastWallet?.walletAddress?.slice(9)) + 1
    }
    const walletAddress = `${registrationDate}${objectCode}${walletCode}`
    const newWallet = await walletModel.create({ walletAddress, refType, ref: refId })
    return walletAddress
}