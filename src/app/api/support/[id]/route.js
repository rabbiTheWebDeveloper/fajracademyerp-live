import { NextResponse } from "next/server";
import { getTicketById, updateTicket, closeTicket, addMessageToTicket } from "@/queries/support-queries";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const ticket = await getTicketById(id);
    if (!ticket) return NextResponse.json({ success: false, message: "Ticket not found" }, { status: 404 });
    return NextResponse.json({ success: true, ticket }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, message, ...updateData } = body;

    if (action === "close") {
      const ticket = await closeTicket(id);
      return NextResponse.json({ success: true, ticket }, { status: 200 });
    }

    if (action === "message" && message) {
      const ticket = await addMessageToTicket(id, message);
      return NextResponse.json({ success: true, ticket }, { status: 200 });
    }

    const ticket = await updateTicket(id, updateData);
    if (!ticket) return NextResponse.json({ success: false, message: "Ticket not found" }, { status: 404 });
    return NextResponse.json({ success: true, ticket }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
