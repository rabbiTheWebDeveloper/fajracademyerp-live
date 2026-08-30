import { NextResponse } from "next/server";
import { GET as handleVerifyWithId } from "./[id]/route";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  return handleVerifyWithId(request, { params: { id } });
}
