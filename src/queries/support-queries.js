import { dbConnect } from "@/service/mongo";
import { SupportTicketModel } from "@/model/support-ticket-model";
import { escapeRegex } from "@/lib/utils";

/**
 * Get paginated list of support tickets
 */
export async function getAllTickets({
  page = 1,
  limit = 20,
  status = "",
  priority = "",
  category = "",
  search = "",
} = {}) {
  await dbConnect();

  const query = {};
  if (status && status !== "all") query.status = status;
  if (priority && priority !== "all") query.priority = priority;
  if (category && category !== "all") query.category = category;
  if (search && search.trim()) {
    const escaped = escapeRegex(search.trim());
    query.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { ticketId: { $regex: escaped, $options: "i" } },
      { raisedByEmail: { $regex: escaped, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [tickets, total] = await Promise.all([
    SupportTicketModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SupportTicketModel.countDocuments(query),
  ]);

  return {
    tickets,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single ticket by ID
 */
export async function getTicketById(id) {
  await dbConnect();
  return SupportTicketModel.findById(id).lean();
}

/**
 * Create a new support ticket
 */
export async function createTicket(data) {
  await dbConnect();
  const ticket = new SupportTicketModel(data);
  await ticket.save();
  return ticket.toObject();
}

/**
 * Update a ticket (status, priority, assignment)
 */
export async function updateTicket(id, data) {
  await dbConnect();
  const ticket = await SupportTicketModel.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
  return ticket;
}

/**
 * Add a reply message to a ticket
 */
export async function addMessageToTicket(ticketId, message) {
  await dbConnect();
  const ticket = await SupportTicketModel.findByIdAndUpdate(
    ticketId,
    { $push: { messages: message } },
    { new: true }
  ).lean();
  return ticket;
}

/**
 * Close a ticket
 */
export async function closeTicket(id) {
  await dbConnect();
  return SupportTicketModel.findByIdAndUpdate(
    id,
    { $set: { status: "closed", closedAt: new Date() } },
    { new: true }
  ).lean();
}

/**
 * Get support dashboard stats
 */
export async function getSupportDashboardStats() {
  await dbConnect();
  const [open, inProgress, urgent, resolved] = await Promise.all([
    SupportTicketModel.countDocuments({ status: "open" }),
    SupportTicketModel.countDocuments({ status: "in-progress" }),
    SupportTicketModel.countDocuments({ priority: "urgent", status: { $nin: ["closed", "resolved"] } }),
    SupportTicketModel.countDocuments({ status: "resolved" }),
  ]);
  return { open, inProgress, urgent, resolved, total: open + inProgress + resolved };
}
