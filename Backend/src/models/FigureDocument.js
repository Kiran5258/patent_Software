import mongoose from "mongoose";

const figureSchema = new mongoose.Schema({
  applicantName: String,
  patent_officer: String,
  totalSheets: Number,
  filePath: {
    url: String,
    public_id: String
  },
  figures: [
    {
      url: String,
      public_id: String
    }
  ],
  signaturePath: {
    url: String,
    public_id: String
  },
}, { timestamps: true });

export default mongoose.model("FigureDocument", figureSchema);