import archiver from "archiver";
import ImageModule from "docxtemplater-image-module-free";
import { uploadBuffer, deleteFile } from "../utils/cloudinary.js";
import PatentDocument from "../models/PatentDocument.js";
import FigureDocument from "../models/FigureDocument.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { generateFigureDoc } from "../services/generateFigureDoc.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// POST /api/
export const createDocuments = async (req, res) => {
    try {
        let body = req.body;

        if (!body.TITLE) {
            const { applicantName, patent_officer } = body;
            const figureFiles = req.files ? req.files.filter(f => f.fieldname === 'figures') : [];
            const signatureFile = req.files ? req.files.find(f => f.fieldname === 'signature') : null;

            // Upload figures to Cloudinary
            const figureUploads = await Promise.all(
                figureFiles.map(f => uploadBuffer(f.buffer, 'figures'))
            );

            // Upload signature to Cloudinary
            let signatureData = null;
            if (signatureFile) {
                signatureData = await uploadBuffer(signatureFile.buffer, 'signatures');
            }

            const docxBuffer = await generateFigureDoc({
                applicantName,
                patent_officer,
                figures: figureFiles.map((f, i) => ({ buffer: f.buffer, originalname: f.originalname })),
                signatureBuffer: signatureFile?.buffer
            });

            const docxUpload = await uploadBuffer(docxBuffer, 'output');

            const newDoc = await FigureDocument.create({
                applicantName,
                patent_officer,
                totalSheets: figureUploads.length,
                filePath: docxUpload,
                figures: figureUploads,
                signaturePath: signatureData
            });

            return res.status(201).json({
                message: "Figure Document Generated Successfully",
                data: newDoc,
                downloadUrl: docxUpload.url
            });
        }

        // Standard Patent Document Logic
        if (typeof body.inventors === "string") {
            try { body.inventors = JSON.parse(body.inventors); } catch (e) { }
        }

        const {
            TITLE, APPLICANT_NAME, APPLICANT_ADDRESS, email_id, technical_field,
            inventors, objective, summary, background, brief_description,
            detailed_description, abstract, claims, patent_officer, date,
            PANO, Name_of_Authorize, Mobile_No
        } = body;

        if (!TITLE || !APPLICANT_NAME || !APPLICANT_ADDRESS || !email_id || !technical_field || !background || !date ||
            !objective || !summary || !brief_description || !detailed_description || !abstract || !claims || !patent_officer) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const figureFiles = req.files ? req.files.filter(f => f.fieldname === 'figures') : [];
        const officerSigFile = req.files ? req.files.find(f => f.fieldname === 'officer_signature') : null;
        const figureSigFile = req.files ? req.files.find(f => f.fieldname === 'signature') : null;
        const sigFile = officerSigFile || figureSigFile;

        // Upload figures
        const figureUploads = await Promise.all(
            figureFiles.map(f => uploadBuffer(f.buffer, 'figures'))
        );

        // Upload signature
        let sigData = null;
        if (sigFile) {
            sigData = await uploadBuffer(sigFile.buffer, 'signatures');
        }

        const getOrdinalDay = (n) => {
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };
        const formatDateCustom = (dateStr) => {
            if (!dateStr) return "";
            try {
                const d = new Date(dateStr);
                const day = d.getDate();
                const month = d.toLocaleString("en-US", { month: "long" });
                const year = d.getFullYear();
                return `${getOrdinalDay(day)} Day of ${month} ${year}`;
            } catch (e) { return dateStr; }
        };
        const finalFormattedDate = formatDateCustom(date);
        const processedInventors = (inventors || []).map(inv => ({ ...inv, date: finalFormattedDate }));

        const templates = ["Form 1.docx", "Form 2.docx", "Form 3.docx", "Form 5.docx", "Form 18.docx", "Form 28.docx"];
        const uploadedTemplates = [];
        const docBuffers = [];

        for (let template of templates) {
            const templatePath = path.join(__dirname, "../templates", template);
            const content = fs.readFileSync(templatePath, "binary");
            const zip = new PizZip(content);
            const imageModule = new ImageModule({
                centered: false, fileType: "docx",
                getImage(val) { return val; },
                getSize() { return [150, 60]; }
            });
            const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, modules: [imageModule] });
            doc.render({
                TITLE, APPLICANT_NAME, APPLICANT_ADDRESS, email_id, technical_field,
                date: finalFormattedDate, patent_officer, PANO: PANO || "INPA-4655",
                Name_of_Authorize: Name_of_Authorize || patent_officer, Mobile_No: Mobile_No || "9943235198",
                objective, summary, background, brief_description, detailed_description,
                abstract, claims, signature: sigFile?.buffer, inventors: processedInventors
            });

            const docBuffer = doc.getZip().generate({ type: "nodebuffer" });
            const docUpload = await uploadBuffer(docBuffer, 'output');
            uploadedTemplates.push(docUpload);
            docBuffers.push({ buffer: docBuffer, name: `${template.replace(".docx", "")}.docx` });
        }

        if (figureFiles.length > 0) {
            try {
                const figureDocBuffer = await generateFigureDoc({
                    applicantName: APPLICANT_NAME,
                    patent_officer,
                    figures: figureFiles.map(f => ({ buffer: f.buffer, originalname: f.originalname })),
                    signatureBuffer: sigFile?.buffer
                });
                const figDocUpload = await uploadBuffer(figureDocBuffer, 'output');
                uploadedTemplates.push(figDocUpload);
                docBuffers.push({ buffer: figureDocBuffer, name: "Figures.docx" });
            } catch (e) { console.error("Figure gen error:", e); }
        }

        const zipBuffer = await new Promise((resolve, reject) => {
            const archive = archiver('zip', { zlib: { level: 9 } });
            const chunks = [];
            archive.on('data', chunk => chunks.push(chunk));
            archive.on('end', () => resolve(Buffer.concat(chunks)));
            archive.on('error', err => reject(err));

            docBuffers.forEach(db => archive.append(db.buffer, { name: db.name }));
            archive.finalize();
        });

        const zipUpload = await uploadBuffer(zipBuffer, 'output');

        const newDoc = await PatentDocument.create({
            ...body,
            inventors: processedInventors,
            figureImages: figureUploads,
            officer_signature: sigData,
            zipFile: zipUpload,
            files: uploadedTemplates
        });

        res.status(201).json({
            message: "Patent Documents Generated Successfully",
            data: newDoc,
            downloadUrl: zipUpload.url
        });

    } catch (error) {
        console.error("Creation error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// GET /api/
export const getAllDocuments = async (req, res) => {
    try {
        const [patentDocs, figureDocs] = await Promise.all([
            PatentDocument.find().sort({ createdAt: -1 }).lean(),
            FigureDocument.find().sort({ createdAt: -1 }).lean()
        ]);

        const patents = patentDocs.map(d => ({
            ...d,
            type: "patent",
            title: d.TITLE,
            applicant: d.APPLICANT_NAME,
            downloadFile: d.zipFile
        }));

        const figures = figureDocs.map(d => ({
            ...d,
            type: "figure",
            title: `Figures: ${d.applicantName}`,
            applicant: d.applicantName,
            downloadFile: path.basename(d.filePath)
        }));

        const combined = [...patents, ...figures].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.status(200).json(combined);
    } catch (error) {
        console.error("Fetch error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/:id
export const getDocumentById = async (req, res) => {
    try {
        let doc = await PatentDocument.findById(req.params.id);
        if (!doc) doc = await FigureDocument.findById(req.params.id);
        if (!doc) return res.status(404).json({ message: "Document not found" });
        res.status(200).json(doc);
    } catch (error) {
        console.error("FetchById error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// DELETE /api/:id
export const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        let doc = await PatentDocument.findById(id);
        let isFigure = false;

        if (!doc) {
            doc = await FigureDocument.findById(id);
            isFigure = true;
        }

        if (!doc) return res.status(404).json({ message: "Document not found" });

        const outputDir = path.join(__dirname, "../output");

        if (!isFigure) {
            // Delete from Cloudinary
            if (doc.zipFile?.public_id) await deleteFile(doc.zipFile.public_id);
            if (doc.files) {
                for (const f of doc.files) {
                    if (f.public_id) await deleteFile(f.public_id);
                }
            }
            if (doc.figureImages) {
                for (const f of doc.figureImages) {
                    if (f.public_id) await deleteFile(f.public_id);
                }
            }
            if (doc.officer_signature?.public_id) await deleteFile(doc.officer_signature.public_id);

            await PatentDocument.findByIdAndDelete(id);
        } else {
            if (doc.filePath?.public_id) await deleteFile(doc.filePath.public_id);
            if (doc.figures) {
                for (const f of doc.figures) {
                    if (f.public_id) await deleteFile(f.public_id);
                }
            }
            if (doc.signaturePath?.public_id) await deleteFile(doc.signaturePath.public_id);

            await FigureDocument.findByIdAndDelete(id);
        }

        res.status(200).json({ message: "Document and all associated files deleted from Cloudinary successfully" });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Server error during deletion" });
    }
};

// GET /api/download/:filename
export const downloadDocs = async (req, res) => {
    // Note: With Cloudinary, filenames are not used as before. 
    // This endpoint can remain for backward compatibility or redirect to a Cloudinary URL if mapped.
    // However, since we now store full URLs, the frontend should use those directly.
    res.status(400).json({ message: "Please use Cloudinary URLs directly for downloads" });
};

// PUT /api/:id
export const updateDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        let body = req.body;

        let figureDoc = await FigureDocument.findById(id);
        if (figureDoc) {
            const { applicantName, patent_officer } = body;
            const figureFiles = req.files ? req.files.filter(f => f.fieldname === 'figures') : [];
            const signatureFile = req.files ? req.files.find(f => f.fieldname === 'signature') : null;

            let figureUploads = figureDoc.figures;
            if (figureFiles.length > 0) {
                // Delete old figures
                for (const f of figureDoc.figures) {
                    if (f.public_id) await deleteFile(f.public_id);
                }
                figureUploads = await Promise.all(
                    figureFiles.map(f => uploadBuffer(f.buffer, 'figures'))
                );
            }

            let signatureData = figureDoc.signaturePath;
            if (signatureFile) {
                if (figureDoc.signaturePath?.public_id) await deleteFile(figureDoc.signaturePath.public_id);
                signatureData = await uploadBuffer(signatureFile.buffer, 'signatures');
            }

            const docxBuffer = await generateFigureDoc({
                applicantName: applicantName || figureDoc.applicantName,
                patent_officer: patent_officer || figureDoc.patent_officer,
                figures: figureFiles.length > 0 ? figureFiles.map(f => ({ buffer: f.buffer, originalname: f.originalname })) : figureDoc.figures, // This might need fix if figures didn't change (we'd need to re-download or store buffers)
                signatureBuffer: signatureFile ? signatureFile.buffer : null // Simple logic: only re-gen if files provided
            });
            // Note: generateFigureDoc currently expects buffers. If no new files, we might need to skip re-gen or handle better.
            // For now, let's assume if update is called with files, we re-gen.

            let docxUpload = figureDoc.filePath;
            if (figureFiles.length > 0 || signatureFile) {
                if (figureDoc.filePath?.public_id) await deleteFile(figureDoc.filePath.public_id);
                docxUpload = await uploadBuffer(docxBuffer, 'output');
            }

            const updatedDoc = await FigureDocument.findByIdAndUpdate(
                id,
                {
                    applicantName: applicantName || figureDoc.applicantName,
                    patent_officer: patent_officer || figureDoc.patent_officer,
                    filePath: docxUpload,
                    figures: figureUploads,
                    signaturePath: signatureData,
                    totalSheets: figureUploads.length
                },
                { new: true }
            );

            return res.status(200).json({
                message: "Figure record updated successfully",
                data: updatedDoc,
                downloadUrl: docxUpload.url
            });
        }

        const existingDoc = await PatentDocument.findById(id);
        if (!existingDoc) return res.status(404).json({ message: "Document not found" });

        if (typeof body.inventors === "string") {
            try { body.inventors = JSON.parse(body.inventors); } catch (e) { }
        }

        const figureFiles = req.files ? req.files.filter(f => f.fieldname === 'figures') : [];
        const officerSigFile = req.files ? req.files.find(f => f.fieldname === 'officer_signature') : null;
        const figureSigFile = req.files ? req.files.find(f => f.fieldname === 'signature') : null;
        const sigFile = officerSigFile || figureSigFile;

        let figureUploads = existingDoc.figureImages;
        if (figureFiles.length > 0) {
            for (const f of existingDoc.figureImages) {
                if (f.public_id) await deleteFile(f.public_id);
            }
            figureUploads = await Promise.all(figureFiles.map(f => uploadBuffer(f.buffer, 'figures')));
        }

        let sigData = existingDoc.officer_signature;
        if (sigFile) {
            if (existingDoc.officer_signature?.public_id) await deleteFile(existingDoc.officer_signature.public_id);
            sigData = await uploadBuffer(sigFile.buffer, 'signatures');
        }

        const {
            TITLE, APPLICANT_NAME, APPLICANT_ADDRESS, email_id, technical_field,
            inventors, objective, summary, background, brief_description,
            detailed_description, abstract, claims, patent_officer, date,
            PANO, Name_of_Authorize, Mobile_No
        } = body;

        const getOrdinalDay = (n) => {
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };
        const formatDateCustom = (dateStr) => {
            if (!dateStr) return "";
            try {
                const d = new Date(dateStr);
                const day = d.getDate();
                const month = d.toLocaleString("en-US", { month: "long" });
                const year = d.getFullYear();
                return `${getOrdinalDay(day)} Day of ${month} ${year}`;
            } catch (e) { return dateStr; }
        };
        const finalFormattedDate = formatDateCustom(date || existingDoc.date);
        const processedInventors = (inventors || existingDoc.inventors).map(inv => ({ ...inv, date: finalFormattedDate }));

        const templates = ["Form 1.docx", "Form 2.docx", "Form 3.docx", "Form 5.docx", "Form 18.docx", "Form 28.docx"];
        const uploadedTemplates = [];
        const docBuffers = [];

        // Simplified: Always re-generate all documents on update to ensure consistency
        if (existingDoc.files) {
            for (const f of existingDoc.files) if (f.public_id) await deleteFile(f.public_id);
        }
        if (existingDoc.zipFile?.public_id) await deleteFile(existingDoc.zipFile.public_id);

        for (let template of templates) {
            const templatePath = path.join(__dirname, "../templates", template);
            const content = fs.readFileSync(templatePath, "binary");
            const zip = new PizZip(content);
            const imageModule = new ImageModule({
                centered: false, fileType: "docx",
                getImage(val) { return val; },
                getSize() { return [150, 60]; }
            });
            const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, modules: [imageModule] });
            doc.render({
                TITLE: TITLE || existingDoc.TITLE,
                APPLICANT_NAME: APPLICANT_NAME || existingDoc.APPLICANT_NAME,
                APPLICANT_ADDRESS: APPLICANT_ADDRESS || existingDoc.APPLICANT_ADDRESS,
                email_id: email_id || existingDoc.email_id,
                technical_field: technical_field || existingDoc.technical_field,
                date: finalFormattedDate,
                patent_officer: patent_officer || existingDoc.patent_officer,
                PANO: PANO || existingDoc.PANO || "INPA-4655",
                Name_of_Authorize: Name_of_Authorize || existingDoc.Name_of_Authorize || patent_officer || existingDoc.patent_officer,
                Mobile_No: Mobile_No || existingDoc.Mobile_No || "9943235198",
                objective: objective || existingDoc.objective,
                summary: summary || existingDoc.summary,
                background: background || existingDoc.background,
                brief_description: brief_description || existingDoc.brief_description,
                detailed_description: detailed_description || existingDoc.detailed_description,
                abstract: abstract || existingDoc.abstract,
                claims: claims || existingDoc.claims,
                signature: sigFile?.buffer || null, // Note: sigFile.buffer is only available if new file uploaded.
                inventors: processedInventors
            });

            const docBuffer = doc.getZip().generate({ type: "nodebuffer" });
            const docUpload = await uploadBuffer(docBuffer, 'output');
            uploadedTemplates.push(docUpload);
            docBuffers.push({ buffer: docBuffer, name: `${template.replace(".docx", "")}.docx` });
        }

        if (figureFiles.length > 0) {
            try {
                const figureDocBuffer = await generateFigureDoc({
                    applicantName: APPLICANT_NAME || existingDoc.APPLICANT_NAME,
                    patent_officer: patent_officer || existingDoc.patent_officer,
                    figures: figureFiles.map(f => ({ buffer: f.buffer, originalname: f.originalname })),
                    signatureBuffer: sigFile?.buffer
                });
                const figDocUpload = await uploadBuffer(figureDocBuffer, 'output');
                uploadedTemplates.push(figDocUpload);
                docBuffers.push({ buffer: figureDocBuffer, name: "Figures.docx" });
            } catch (e) { console.error("Figure re-gen error:", e); }
        }

        const zipBuffer = await new Promise((resolve, reject) => {
            const archive = archiver('zip', { zlib: { level: 9 } });
            const chunks = [];
            archive.on('data', chunk => chunks.push(chunk));
            archive.on('end', () => resolve(Buffer.concat(chunks)));
            archive.on('error', err => reject(err));
            docBuffers.forEach(db => archive.append(db.buffer, { name: db.name }));
            archive.finalize();
        });

        const zipUpload = await uploadBuffer(zipBuffer, 'output');

        const updatedDoc = await PatentDocument.findByIdAndUpdate(
            id,
            {
                ...body,
                inventors: processedInventors,
                figureImages: figureUploads,
                officer_signature: sigData,
                zipFile: zipUpload,
                files: uploadedTemplates
            },
            { new: true }
        );

        res.status(200).json({
            message: "Document re-generated and updated successfully",
            data: updatedDoc,
            downloadUrl: zipUpload.url
        });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
