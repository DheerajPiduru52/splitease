export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { respondToRequestSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = respondToRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { friendshipId, action } = parsed.data;
    const userId = session.user.id;

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return NextResponse.json(
        { error: "Friend request not found" },
        { status: 404 }
      );
    }

    if (friendship.addresseeId !== userId) {
      return NextResponse.json(
        { error: "Not authorized to respond to this request" },
        { status: 403 }
      );
    }

    if (friendship.status !== "PENDING") {
      return NextResponse.json(
        { error: "This request has already been responded to" },
        { status: 409 }
      );
    }

    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: {
        status: action === "ACCEPT" ? "ACCEPTED" : "DECLINED",
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Respond to friend request error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
