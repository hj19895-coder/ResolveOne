import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ⚠️ ADJUST: keep in sync with utils/notification.js
const ADMIN_ROLE_NAMES = ["SUPER_ADMIN", "ADMIN"];

function isAdminLike(req) {
  return ADMIN_ROLE_NAMES.includes(req.user?.role);
}

// GET /api/notifications
export async function getNotifications(req, res) {
  try {
    const userId = req.user.userId;
    const admin = isAdminLike(req);

    const notifications = await prisma.notification.findMany({
      where: admin ? {} : { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, name: true } },
        ticket: { select: { id: true, ticketNumber: true, subject: true } },
      },
    });

    res.json({ notifications, viewingAll: admin });
  } catch (err) {
    console.error("getNotifications error:", err);
    res.status(500).json({ message: "Failed to load notifications" });
  }
}

// GET /api/notifications/unread-count
// GET /api/notifications/unread-count
export async function getUnreadCount(req, res) {
  try {
    const admin = isAdminLike(req);

    if (!admin) {
      const count = await prisma.notification.count({
        where: { userId: req.user.userId, isRead: false },
      });
      return res.json({ count });
    }

    // Admin view: count DISTINCT (ticketId + type + message) groups,
    // matching the same grouping logic used in the frontend panel.
    const groups = await prisma.notification.groupBy({
      by: ["ticketId", "type", "message"],
      where: { isRead: false },
    });

    res.json({ count: groups.length });
  } catch (err) {
    console.error("getUnreadCount error:", err);
    res.status(500).json({ message: "Failed to load unread count" });
  }
}

// PATCH /api/notifications/:id/read
export async function markRead(req, res) {
  try {
    const { id } = req.params;
    const admin = isAdminLike(req);
    const updated = await prisma.notification.updateMany({
      where: admin ? { id } : { id, userId: req.user.userId },
      data: { isRead: true },
    });
    if (updated.count === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("markRead error:", err);
    res.status(500).json({ message: "Failed to mark as read" });
  }
}

// PATCH /api/notifications/read-all
export async function markAllRead(req, res) {
  try {
    const admin = isAdminLike(req);
    await prisma.notification.updateMany({
      where: admin ? { isRead: false } : { userId: req.user.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    console.error("markAllRead error:", err);
    res.status(500).json({ message: "Failed to mark all as read" });
  }
}