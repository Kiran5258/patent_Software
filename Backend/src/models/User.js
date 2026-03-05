import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    type: { type: String, enum: ['attorney', 'offline'], default: 'offline' },
    offlineMode: { type: String, enum: ['KRCE', 'KRCT', 'MKCE', null], default: null }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
