import express from "express";
import dotenv from "dotenv"
import cors from "cors";
import documentRoutes from "./routes/documentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import connectdb from "./lib/db.js";

const app = express();
dotenv.config();

app.use(express.json());
app.use(cors({
    origin: "*",
}))
app.use("/uploads", express.static("uploads"));
app.use("/output", express.static("output"));
app.use("/api/auth", authRoutes)
app.use("/api", documentRoutes)
const Port = process.env.PORT;
app.listen(Port, () => {
    console.log("App is currently running on Port : " + Port);
    connectdb();
})