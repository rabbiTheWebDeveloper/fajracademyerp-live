import { NextResponse } from "next/server";
import { getActivities, createActivity } from "@/queries/staff-queries";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await getActivities({
      staffId:  searchParams.get("staffId")  || undefined,
      date:     searchParams.get("date")     || undefined,
      status:   searchParams.get("status")   || "",
      category: searchParams.get("category") || "",
      page:     Number(searchParams.get("page"))  || 1,
      limit:    Number(searchParams.get("limit")) || 50,
    });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("GET /api/staff/activities:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.staff)    return NextResponse.json({ success: false, message: "Staff ID is required." }, { status: 400 });
    if (!body.title)    return NextResponse.json({ success: false, message: "Title is required." }, { status: 400 });
    if (!body.category) return NextResponse.json({ success: false, message: "Category is required." }, { status: 400 });
    if (!body.date) body.date = new Date().toISOString();
    const activity = await createActivity(body);
    return NextResponse.json({ success: true, activity }, { status: 201 });
  } catch (error) {
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors).map(e => e.message).join(" ");
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
