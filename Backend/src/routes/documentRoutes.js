import express from "express";
import {
  createDocuments,
  downloadDocs,
  getAllDocuments,
  getDocumentById,
  updateDocuments,
  deleteDocument,
  proxyDownload
} from "../controllers/documentController.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

import { upload } from "../middleware/upload.js";

const router = express.Router();

router.get("/download-proxy", proxyDownload);
router.post("/", upload.any(), createDocuments);
router.get("/", authenticate, authorizeAdmin, getAllDocuments);
router.get("/:id", authenticate, authorizeAdmin, getDocumentById);
router.delete("/:id", authenticate, authorizeAdmin, deleteDocument);
router.get("/download/:filename", downloadDocs);
router.put("/:id", upload.any(), updateDocuments);

export default router;