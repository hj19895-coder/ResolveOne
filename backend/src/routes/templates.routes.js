import express from "express";
import { protect, requirePermission } from "../middleware/auth.middleware.js";
import {
  getTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate,
} from "../controllers/templates.controller.js";


const router = express.Router();

router.use(protect);

router.get("/", requirePermission("templates", "canView"), getTemplates);
router.get("/:id", requirePermission("templates", "canView"), getTemplate);
router.post("/", requirePermission("templates", "canCreate"), createTemplate);
router.put("/:id", requirePermission("templates", "canEdit"), updateTemplate);
router.delete("/:id", requirePermission("templates", "canDelete"), deleteTemplate);

export default router;