import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { friendRequestSchema } from "@/lib/validations";

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
    const parsed = friendRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { addresseeId } = parsed.data;
    const requesterId = session.user.id;

    if (requesterId === addresseeId) {
      return NextResponse.json(
        { error: "Cannot send friend request to yourself" },
        { status: 400 }
      );
    }

    // Check if addressee exists
    const addressee = await prisma.user.findUnique({
      where: { id: addresseeId },
    });

    if (!addressee) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if friendship already exists (in either direction)
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === "ACCEPTED") {
        return NextResponse.json(
          { error: "Already friends" },
          { status: 409 }
        );
      }
      if (existing.status === "PENDING") {
        return NextResponse.json(
          { error: "Friend request already pending" },
          { status: 409 }
        );
      }
      // If DECLINED, allow re-requesting
      const updated = await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: "PENDING", requesterId, addresseeId },
      });
      return NextResponse.json(updated, { status: 201 });
    }

    const friendship = await prisma.friendship.create({
      data: { requesterId, addresseeId },
    });

    return NextResponse.json(friendship, { status: 201 });
  } catch (err) {
    console.error("Friend request error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
