import moment from "moment";

let groupSequence = 1;

export const generateGroupID = () => {
    const registrationDate = moment().format("DDMM");
    const sequenceNumber = groupSequence.toString().padStart(5, "0");
    groupSequence++;  // Increment sequence for the next group
    return `${registrationDate}${sequenceNumber}`;
};

export const generateBFVirtualWalletID = (groupID: string) => {
    const bfSequence = 0;
    return `${groupID}1${bfSequence.toString().padStart(4, "0")}`;
};

export const generateSACCONVirtualWalletID = (groupID: string) => {
    const saccoSequence = 0;
    return `${groupID}2${saccoSequence.toString().padStart(4, "0")}`;
};

export const generateProfileID = (national_id_number: string) => {
    const registrationDate = moment().format("DDMM");
    const year = moment().format("YY");

    const personalID = national_id_number
        ? national_id_number.padEnd(14, "0").slice(0, 14)
        : Math.random().toString(36).substring(2, 16).padEnd(14, "0");

    return `${registrationDate}${personalID}${year}`;
};

