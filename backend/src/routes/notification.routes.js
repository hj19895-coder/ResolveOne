import express from "express";
const router = express.Router();

import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from "../controllers/notification.controller.js";

// ⚠️ ADJUST: import whatever your auth middleware actually exports
import { protect } from "../middleware/auth.middleware.js";

router.use(protect);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/:id/read", markRead);
router.patch("/read-all", markAllRead);

export default router;