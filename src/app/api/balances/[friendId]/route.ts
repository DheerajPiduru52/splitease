export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateBalanceBetween } from "@/lib/balances";

export async function GET(
  _request: Request,
  { params }: { params: { friendId: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const netBalance = await calculateBalanceBetween(
      session.user.id,
      params.friendId
    );

    return NextResponse.json({ netBalance });
  } catch (err) {
    console.error("Get balance error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
