export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const group = await prisma.group.findUnique({
      where: { id: params.id },
      include: { members: true },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 400 }
      );
    }

    if (group.createdById === userId) {
      return NextResponse.json(
        { error: "Group creator cannot leave. Transfer ownership or delete the group." },
        { status: 400 }
      );
    }

    await prisma.groupMember.deleteMany({
      where: { groupId: params.id, userId },
    });

    return NextResponse.json({ message: "Left group successfully" });
  } catch (err) {
    console.error("Leave group error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
