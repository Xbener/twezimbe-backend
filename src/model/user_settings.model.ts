import { Schema, model } from 'mongoose';

const UserSettingsSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },

    notificationSettings: {
        chatroomsMuted: [{ type: Schema.Types.ObjectId, ref: 'chatrooms' }], // Array of chatrooms user has muted
        notifyOnMention: { type: Boolean, default: true },                   // Enable or disable notifications for mentions
        notifyOnDirectMessage: { type: Boolean, default: true },             // Enable or disable notifications for direct messages
        notifyOnReaction: { type: Boolean, default: false },                 // Enable or disable notifications for reactions (e.g., likes)
        notifyOnOtherEvents: { type: Boolean, default: false }               // Any other notification preferences you may want
    }
});

const UserSettings = model('UserSettings', UserSettingsSchema);

export default UserSettings;
