// resetTickets.js
// Run with: node resetTickets.js
// Requires DATABASE_URL env var to be set (same as backend uses).
//
// What this does:
//   1. Clears ticket-to-ticket merge links (mergedIntoId -> null)
//   2. Detaches notifications from tickets (keeps notifications, unlinks ticketId)
//   3. Deletes all TicketHistory rows (cascade would do this anyway, explicit for clarity)
//   4. Deletes all Tickets
//   5. Resets the ticketNumber auto-increment sequence back to 1
//
// Untouched: User, Role, RolePermission, MasterData, TicketTemplate

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Step 1/5: Clearing merge links...");
  await prisma.ticket.updateMany({
    data: { mergedIntoId: null },
  });

  console.log("Step 2/5: Detaching notifications from tickets...");
  await prisma.notification.updateMany({
    where: { ticketId: { not: null } },
    data: { ticketId: null },
  });

  console.log("Step 3/5: Deleting ticket history...");
  await prisma.ticketHistory.deleteMany({});

  console.log("Step 4/5: Deleting all tickets...");
  const { count } = await prisma.ticket.deleteMany({});
  console.log(`  Deleted ${count} tickets.`);

  console.log("Step 5/5: Resetting ticketNumber sequence to 1...");
  const seqResult = await prisma.$queryRawUnsafe(
    `SELECT pg_get_serial_sequence('"Ticket"', 'ticketNumber') as seq`
  );
  const seqName = seqResult[0].seq;
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE ${seqName} RESTART WITH 1`);

  console.log("Done! All tickets deleted, next ticket created will get ticketNumber = 1.");
}

main()
  .catch((err) => {
    console.error("Error while resetting tickets:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());