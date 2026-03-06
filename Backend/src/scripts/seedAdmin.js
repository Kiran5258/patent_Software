import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../.env") });

const seedAdmin = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error("MONGO_URI is not defined");

        await mongoose.connect(uri);
        console.log("Connected to MongoDB...");

        const adminExists = await User.findOne({ role: "admin" });

        if (adminExists) {
            console.log("Admin user already exists.");
        } else {
            const adminEmail = "admin@patent.com";
            const adminPassword = "AdminPassword@123"; // Strong password as per your rules

            await User.create({
                email: adminEmail,
                password: adminPassword,
                role: "admin",
                type: "attorney"
            });

            console.log("Admin user created successfully!");
            console.log(`Email: ${adminEmail}`);
            console.log(`Password: ${adminPassword}`);
            console.log("PLEASE CHANGE THIS PASSWORD AFTER YOUR FIRST LOGIN.");
        }

        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

seedAdmin();
