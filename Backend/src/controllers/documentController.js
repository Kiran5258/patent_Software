import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import FigureDocument from "../models/FigureDocument.js";
import PatentDocument from "../models/PatentDocument.js";
import { generateFigureDoc } from "../services/generateFigureDoc.js";
import archiver from "archiver";
import ImageModule from "docxtemplater-image-module-free";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// POST /api/
export const createDocuments = async (req, res) => {
    try {
        let body = req.body;

        // Detection: If TITLE is missing, it's a Figure Document
        if (!body.TITLE) {
            const { applicantName, patent_officer } = body;
            const figures = req.files ? req.files.filter(f => f.fieldname === 'figures').map(f => f.path) : [];
            const signaturePath = req.files ? req.files.find(f => f.fieldname === 'signature')?.path : null;

            const filePath = await generateFigureDoc({
                applicantName,
                patent_officer,
                figures,
                signaturePath
            });

            const newDoc = await FigureDocument.create({
                applicantName,
                patent_officer,
                totalSheets: figures.length,
                filePath,
                figures,
                signaturePath
            });

            return res.status(201).json({
                message: "Figure Document Generated Successfully",
                data: newDoc,
                downloadUrl: `/api/download/${path.basename(filePath)}`
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

        const figures = req.files ? req.files.filter(f => f.fieldname === 'figures').map(f => f.path) : [];
        const officerSigFile = req.files ? req.files.find(f => f.fieldname === 'officer_signature') : null;
        const figureSigFile = req.files ? req.files.find(f => f.fieldname === 'signature') : null;
        const effectiveSignaturePath = officerSigFile?.path || figureSigFile?.path;

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
        const outputDir = path.join(__dirname, "../output");
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
        const savedFiles = [];

        for (let template of templates) {
            const templatePath = path.join(__dirname, "../templates", template);
            const content = fs.readFileSync(templatePath, "binary");
            const zip = new PizZip(content);
            const imageModule = new ImageModule({
                centered: false, fileType: "docx",
                getImage(val) { if (!val || !fs.existsSync(val)) return null; return fs.readFileSync(val); },
                getSize() { return [150, 60]; }
            });
            const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, modules: [imageModule] });
            doc.render({
                TITLE, APPLICANT_NAME, APPLICANT_ADDRESS, email_id, technical_field,
                date: finalFormattedDate, patent_officer, PANO: PANO || "INPA-4655",
                Name_of_Authorize: Name_of_Authorize || patent_officer, Mobile_No: Mobile_No || "9943235198",
                objective, summary, background, brief_description, detailed_description,
                abstract, claims, signature: effectiveSignaturePath, inventors: processedInventors
            });
            const outputFileName = `${template.replace(".docx", "")}_${Date.now()}.docx`;
            const outputPath = path.join(outputDir, outputFileName);
            fs.writeFileSync(outputPath, doc.getZip().generate({ type: "nodebuffer" }));
            savedFiles.push(outputFileName);
        }

        if (figures.length > 0) {
            try {
                const figureDocPath = await generateFigureDoc({
                    applicantName: APPLICANT_NAME,
                    patent_officer,
                    figures,
                    signaturePath: effectiveSignaturePath
                });
                const figureDocName = path.basename(figureDocPath);
                fs.copyFileSync(figureDocPath, path.join(outputDir, figureDocName));
                savedFiles.push(figureDocName);
            } catch (e) { console.error("Figure gen error:", e); }
        }

        const zipFileName = `Patent_Documents_${Date.now()}.zip`;
        const zipPath = path.join(outputDir, zipFileName);
        const outputStream = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(outputStream);
        for (let file of savedFiles) archive.file(path.join(outputDir, file), { name: file });
        await archive.finalize();

        const newDoc = await PatentDocument.create({
            ...body,
            inventors: processedInventors,
            figureImages: figures,
            officer_signature: effectiveSignaturePath,
            zipFile: zipFileName,
            files: savedFiles
        });

        res.status(201).json({
            message: "Patent Documents Generated Successfully",
            data: newDoc,
            downloadUrl: `/api/download/${zipFileName}`
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
            // Delete files from output directory
            if (doc.zipFile) {
                const zipPath = path.join(outputDir, doc.zipFile);
                if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            }
            if (doc.files && Array.isArray(doc.files)) {
                doc.files.forEach(file => {
                    const filePath = path.join(outputDir, file);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                });
            }
            // Delete files from uploads directory (the source files)
            if (doc.officer_signature && fs.existsSync(doc.officer_signature)) {
                fs.unlinkSync(doc.officer_signature);
            }
            if (doc.figureImages && Array.isArray(doc.figureImages)) {
                doc.figureImages.forEach(file => {
                    if (fs.existsSync(file)) fs.unlinkSync(file);
                });
            }
            await PatentDocument.findByIdAndDelete(id);
        } else {
            // Delete main docx from uploads/output
            if (doc.filePath && fs.existsSync(doc.filePath)) {
                fs.unlinkSync(doc.filePath);
            }
            // Delete uploaded figures and signature
            if (doc.figures && Array.isArray(doc.figures)) {
                doc.figures.forEach(file => {
                    if (fs.existsSync(file)) fs.unlinkSync(file);
                });
            }
            if (doc.signaturePath && fs.existsSync(doc.signaturePath)) {
                fs.unlinkSync(doc.signaturePath);
            }
            await FigureDocument.findByIdAndDelete(id);
        }

        res.status(200).json({ message: "Document and all associated files deleted successfully" });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Server error during deletion" });
    }
};

// GET /api/download/:filename
export const downloadDocs = async (req, res) => {
    try {
        const { filename } = req.params;
        const outputPath = path.join(__dirname, "../output", filename);
        const uploadPath = path.join(__dirname, "../../uploads", filename);

        if (fs.existsSync(outputPath)) return res.download(outputPath);
        if (fs.existsSync(uploadPath)) return res.download(uploadPath);

        res.status(404).json({ message: "File not found" });
    } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ message: "Error downloading file" });
    }
};

// PUT /api/:id
export const updateDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        let body = req.body;

        let figureDoc = await FigureDocument.findById(id);
        if (figureDoc) {
            const { applicantName, patent_officer } = body;
            let figures = req.files ? req.files.filter(f => f.fieldname === 'figures').map(f => f.path) : [];
            let signaturePath = req.files ? req.files.find(f => f.fieldname === 'signature')?.path : null;

            let filePath = figureDoc.filePath;
            if (figures.length > 0 || signaturePath) {
                // Delete old file if creating new one
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

                filePath = await generateFigureDoc({
                    applicantName: applicantName || figureDoc.applicantName,
                    patent_officer: patent_officer || figureDoc.patent_officer,
                    figures: figures.length > 0 ? figures : figureDoc.figures,
                    signaturePath: signaturePath || figureDoc.signaturePath
                });
            }

            const updatedDoc = await FigureDocument.findByIdAndUpdate(
                id,
                {
                    applicantName: applicantName || figureDoc.applicantName,
                    patent_officer: patent_officer || figureDoc.patent_officer,
                    filePath,
                    figures: figures.length > 0 ? figures : figureDoc.figures,
                    signaturePath: signaturePath || figureDoc.signaturePath,
                    totalSheets: figures.length > 0 ? figures.length : figureDoc.totalSheets
                },
                { new: true }
            );

            return res.status(200).json({
                message: "Figure record updated successfully",
                data: updatedDoc,
                downloadUrl: `/api/download/${path.basename(filePath)}`
            });
        }

        const existingDoc = await PatentDocument.findById(id);
        if (!existingDoc) return res.status(404).json({ message: "Document not found" });

        if (typeof body.inventors === "string") {
            try { body.inventors = JSON.parse(body.inventors); } catch (e) { }
        }

        let figures = [];
        if (req.files && req.files.length > 0) {
            const uploaded = req.files.filter(f => f.fieldname === 'figures').map(f => f.path);
            if (uploaded.length > 0) figures = uploaded;
        }

        if (figures.length === 0 && body.existingFigures) {
            figures = Array.isArray(body.existingFigures) ? body.existingFigures : [body.existingFigures];
        } else if (figures.length === 0) {
            figures = existingDoc.figureImages;
        }

        const officerSigFile = req.files ? req.files.find(f => f.fieldname === 'officer_signature') : null;
        const signaturePath = officerSigFile ? officerSigFile.path : existingDoc.officer_signature;

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
        const outputDir = path.join(__dirname, "../output");
        const savedFiles = [];

        // Delete old files
        if (existingDoc.zipFile && fs.existsSync(path.join(outputDir, existingDoc.zipFile))) {
            fs.unlinkSync(path.join(outputDir, existingDoc.zipFile));
        }
        if (existingDoc.files) {
            existingDoc.files.forEach(f => {
                const p = path.join(outputDir, f);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            });
        }

        for (let template of templates) {
            const templatePath = path.join(__dirname, "../templates", template);
            const content = fs.readFileSync(templatePath, "binary");
            const zip = new PizZip(content);
            const imageModule = new ImageModule({
                centered: false, fileType: "docx",
                getImage(val) { if (!val || !fs.existsSync(val)) return null; return fs.readFileSync(val); },
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
                signature: signaturePath,
                inventors: processedInventors
            });
            const outputFileName = `${template.replace(".docx", "")}_${Date.now()}.docx`;
            const outputPath = path.join(outputDir, outputFileName);
            fs.writeFileSync(outputPath, doc.getZip().generate({ type: "nodebuffer" }));
            savedFiles.push(outputFileName);
        }

        if (figures.length > 0) {
            try {
                const figureDocPath = await generateFigureDoc({
                    applicantName: APPLICANT_NAME || existingDoc.APPLICANT_NAME,
                    patent_officer: patent_officer || existingDoc.patent_officer,
                    figures,
                    signaturePath
                });
                const figureDocName = path.basename(figureDocPath);
                fs.copyFileSync(figureDocPath, path.join(outputDir, figureDocName));
                savedFiles.push(figureDocName);
            } catch (e) { console.error("Figure re-gen error:", e); }
        }

        const zipFileName = `Patent_Updated_${Date.now()}.zip`;
        const zipPath = path.join(outputDir, zipFileName);
        const outputStream = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(outputStream);
        for (let file of savedFiles) archive.file(path.join(outputDir, file), { name: file });
        await archive.finalize();

        const updatedDoc = await PatentDocument.findByIdAndUpdate(
            id,
            {
                ...body,
                inventors: processedInventors,
                figureImages: figures,
                officer_signature: signaturePath,
                zipFile: zipFileName,
                files: savedFiles
            },
            { new: true }
        );

        res.status(200).json({
            message: "Document re-generated and updated successfully",
            data: updatedDoc,
            downloadUrl: `/api/download/${zipFileName}`
        });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
