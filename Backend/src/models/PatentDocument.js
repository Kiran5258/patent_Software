import mongoose from "mongoose";

const patentDocumentSchema = new mongoose.Schema({
    TITLE: { type: String, required: true },
    APPLICANT_NAME: { type: String, required: true },
    APPLICANT_ADDRESS: { type: String, required: true },
    email_id: { type: String, required: true },
    technical_field: { type: String, required: true },
    inventors: [
        {
            inventor_name: String,
            inventor_address: String,
        }
    ],
    objective: { type: String, required: true },
    summary: { type: String, required: true },
    background: { type: String, required: true },
    brief_description: { type: String, required: true },
    detailed_description: { type: String, required: true },
    abstract: { type: String, required: true },
    claims: { type: String, required: true },
    patent_officer: { type: String, required: true },
    PANO: { type: String },
    Name_of_Authorize: { type: String },
    Mobile_No: { type: String },
    date: { type: Date, required: true },
    zipFile: { type: String },
    files: [{ type: String }],
    figureImages: [{ type: String }],
    officer_signature: { type: String }
}, { timestamps: true });

export default mongoose.model("PatentDocument", patentDocumentSchema);
