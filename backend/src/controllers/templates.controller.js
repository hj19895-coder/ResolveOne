import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const TEMPLATE_FIELDS = [
  "requesterName", "subject", "description", "remarks", "reopened",
  "tat", "assignedOn", "estimatedTatHrs", "assignedToId",
  "statusId", "sourceId", "levelId", "groupId", "severityId", "raisedById",
  "siteId", "ticketTypeId", "clientNameId", "priorityId", "categoryId",
  "subcategoryId", "itemId", "rootCauseCategoryId",
];

function pickTemplateFields(body) {
  const data = {};
  for (const key of TEMPLATE_FIELDS) {
    if (body[key] === undefined) continue;
    if (key === "tat" || key === "assignedOn") {
      data[key] = body[key] ? new Date(body[key]) : null;
    } else if (key === "estimatedTatHrs") {
      data[key] = body[key] === "" || body[key] === null ? null : Number(body[key]);
    } else {
      data[key] = body[key] === "" ? null : body[key];
    }
  }
  return data;
}

export async function getTemplates(req, res) {
  try {
    const templates = await prisma.ticketTemplate.findMany({
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    });
    res.json({ templates });
  } catch (err) {
    console.error("getTemplates error:", err);
    res.status(500).json({ message: "Failed to load templates" });
  }
}

export async function getTemplate(req, res) {
  try {
    const template = await prisma.ticketTemplate.findUnique({ where: { id: req.params.id } });
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json({ template });
  } catch (err) {
    console.error("getTemplate error:", err);
    res.status(500).json({ message: "Failed to load template" });
  }
}

export async function createTemplate(req, res) {
  try {
    const { name, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Template name is required" });

    const template = await prisma.ticketTemplate.create({
      data: {
        name: name.trim(),
        notes: notes || null,
        createdById: req.user.userId,
        ...pickTemplateFields(req.body),
      },
    });
    res.status(201).json({ template });
  } catch (err) {
    console.error("createTemplate error:", err);
    if (err.code === "P2002") return res.status(400).json({ message: "A template with this name already exists" });
    res.status(500).json({ message: "Failed to create template" });
  }
}

export async function updateTemplate(req, res) {
  try {
    const { id } = req.params;
    const { name, notes } = req.body;
    const data = { ...pickTemplateFields(req.body) };
    if (name !== undefined) data.name = name.trim();
    if (notes !== undefined) data.notes = notes || null;

    const template = await prisma.ticketTemplate.update({ where: { id }, data });
    res.json({ template });
  } catch (err) {
    console.error("updateTemplate error:", err);
    if (err.code === "P2025") return res.status(404).json({ message: "Template not found" });
    if (err.code === "P2002") return res.status(400).json({ message: "A template with this name already exists" });
    res.status(500).json({ message: "Failed to update template" });
  }
}

export async function deleteTemplate(req, res) {
  try {
    await prisma.ticketTemplate.delete({ where: { id: req.params.id } });
    res.json({ message: "Template deleted successfully" });
  } catch (err) {
    console.error("deleteTemplate error:", err);
    if (err.code === "P2025") return res.status(404).json({ message: "Template not found" });
    res.status(500).json({ message: "Failed to delete template" });
  }
}