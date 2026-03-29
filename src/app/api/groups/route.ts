export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createGroupSchema } from "@/lib/validations";

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const groups = await prisma.group.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        _count: {
          select: { members: true, expenses: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          take: 5,
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(groups);
  } catch (err) {
    console.error("Get groups error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const parsed = createGroupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, description, memberIds } = parsed.data;
    const userId = session.user.id;

    // Include creator in members
    const allMemberIds = [...new Set([userId, ...memberIds])];

    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.group.create({
        data: {
          name,
          description,
          createdById: userId,
        },
      });

      await tx.groupMember.createMany({
        data: allMemberIds.map((memberId) => ({
          groupId: newGroup.id,
          userId: memberId,
        })),
        skipDuplicates: true,
      });

      return tx.group.findUnique({
        where: { id: newGroup.id },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
          },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { members: true, expenses: true } },
        },
      });
    });

    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    console.error("Create group error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
