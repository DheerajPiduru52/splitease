import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createSettlementSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const userId = session.user.id;

    const settlements = await prisma.settlement.findMany({
      where: {
        ...(groupId ? { groupId } : {}),
        OR: [{ payerId: userId }, { payeeId: userId }],
      },
      include: {
        payer: { select: { id: true, name: true, avatarUrl: true } },
        payee: { select: { id: true, name: true, avatarUrl: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(settlements);
  } catch (err) {
    console.error("Get settlements error:", err);
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
    const parsed = createSettlementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { payeeId, amount, groupId, notes } = parsed.data;
    const payerId = session.user.id;

    if (payerId === payeeId) {
      return NextResponse.json(
        { error: "Cannot settle with yourself" },
        { status: 400 }
      );
    }

    // Verify payee exists
    const payee = await prisma.user.findUnique({ where: { id: payeeId } });
    if (!payee) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const settlement = await prisma.settlement.create({
      data: {
        payerId,
        payeeId,
        amount,
        groupId: groupId ?? null,
        notes: notes ?? null,
      },
      include: {
        payer: { select: { id: true, name: true, avatarUrl: true } },
        payee: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json(settlement, { status: 201 });
  } catch (err) {
    console.error("Create settlement error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
