import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const router = express.Router();

const validatePassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
};

const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

router.post("/signup", async (req, res) => {
    try {
        const { email, password, type, offlineMode } = req.body;

        if (!validateEmail(email)) return res.status(400).json({ message: "Invalid email format" });
        if (!validatePassword(password)) {
            return res.status(400).json({ message: "Password must be at least 8 characters, include uppercase, lowercase, number and special character (@$!%*?&)" });
        }

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: "User already exists" });

        const userCount = await User.countDocuments();
        const role = userCount === 0 ? 'admin' : 'user';

        const user = await User.create({ email, password, role, type, offlineMode });
        res.status(201).json({ message: "Account created", user: { email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ message: "Signup failed", error: error.message });
    }
});

router.get("/users", authenticate, authorizeAdmin, async (req, res) => {
    try {
        const users = await User.find({}, '-password').sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

router.delete("/users/:id", authenticate, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const userToDelete = await User.findById(id);
        if (!userToDelete) return res.status(404).json({ message: "User not found" });
        if (userToDelete.role === 'admin') return res.status(403).json({ message: "Cannot delete admin" });
        await User.findByIdAndDelete(id);
        res.status(200).json({ message: "User deleted" });
    } catch (error) {
        res.status(500).json({ message: "Delete failed" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id, role: user.role, type: user.type, offlineMode: user.offlineMode }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
        res.status(200).json({
            token,
            user: {
                email: user.email,
                role: user.role,
                type: user.type,
                offlineMode: user.offlineMode
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error: error.message });
    }
});

export default router;
