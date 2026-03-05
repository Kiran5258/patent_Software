import mongoose from "mongoose";

const figureSchema = new mongoose.Schema({
  applicantName: String,
  patent_officer: String,
  totalSheets: Number,
  filePath: String,
  figures: [String],
  signaturePath: String,
}, { timestamps: true });

export default mongoose.model("FigureDocument", figureSchema);