import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ⚠️ ADJUST: if your SuperAdmin/Admin roles are named differently in the Role table
const ADMIN_ROLE_NAMES = ["SUPER_ADMIN", "ADMIN"];

/**
 * Returns ids of all SuperAdmin/Admin users, optionally excluding one (the actor).
 */
export async function getAdminUserIds(excludeUserId) {
  const admins = await prisma.user.findMany({
    where: { role: { name: { in: ADMIN_ROLE_NAMES } } },
    select: { id: true },
  });
  return admins.map((a) => a.id).filter((id) => id !== excludeUserId);
}

/**
 * Low-level insert. Creates one notification row per recipient.
 */
export async function notify({ userIds, type, title, message, ticketId }) {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueIds.length === 0) return;
  await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({ userId, type, title, message, ticketId })),
  });
}

/**
 * Main helper for ticket lifecycle events.
 */
export async function notifyTicketEvent({ type, title, message, ticketId, targetUserId, actorUserId }) {
  const recipientIds = new Set();
  if (targetUserId && targetUserId !== actorUserId) recipientIds.add(targetUserId);

  const adminIds = await getAdminUserIds(actorUserId);
  adminIds.forEach((id) => recipientIds.add(id));

  await notify({ userIds: [...recipientIds], type, title, message, ticketId });
}