import express from "express";
import {
  createDocuments,
  downloadDocs,
  getAllDocuments,
  getDocumentById,
  updateDocuments,
  deleteDocument
} from "../controllers/documentController.js";
import { upload } from "../middleware/upload.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const router = express.Router();

router.post("/", upload.any(), createDocuments);
router.get("/", authenticate, authorizeAdmin, getAllDocuments);
router.get("/:id", authenticate, authorizeAdmin, getDocumentById);
router.delete("/:id", authenticate, authorizeAdmin, deleteDocument);
router.get("/download/:filename", downloadDocs);
router.put("/:id", upload.any(), updateDocuments);

export default router;