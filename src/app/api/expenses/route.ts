import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createExpenseSchema } from "@/lib/validations";
import { distributeAmount } from "@/lib/balances";
import Decimal from "decimal.js";

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
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const userId = session.user.id;

    const expenses = await prisma.expense.findMany({
      where: {
        ...(groupId
          ? { groupId }
          : {}),
        OR: [
          { paidById: userId },
          { splits: { some: { userId } } },
        ],
      },
      include: {
        paidBy: { select: { id: true, name: true, avatarUrl: true } },
        group: { select: { id: true, name: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(expenses);
  } catch (err) {
    console.error("Get expenses error:", err);
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
    const parsed = createExpenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const {
      description,
      totalAmount,
      currency,
      paidById,
      groupId,
      splitMethod,
      date,
      notes,
      participants,
    } = parsed.data;

    const total = new Decimal(totalAmount);

    // Calculate owed amounts based on split method
    let splits: { userId: string; owedAmount: Decimal; splitValue: Decimal }[];

    switch (splitMethod) {
      case "EQUAL": {
        const amounts = distributeAmount(total, participants.length);
        splits = participants.map((p, i) => ({
          userId: p.userId,
          owedAmount: amounts[i],
          splitValue: new Decimal(1),
        }));
        break;
      }

      case "EXACT_AMOUNTS": {
        const sum = participants.reduce(
          (acc, p) => acc.plus(new Decimal(p.splitValue)),
          new Decimal(0)
        );
        if (!sum.toDecimalPlaces(2).equals(total.toDecimalPlaces(2))) {
          return NextResponse.json(
            {
              error: `Split amounts (${sum.toFixed(2)}) must equal total amount (${total.toFixed(2)})`,
            },
            { status: 400 }
          );
        }
        splits = participants.map((p) => ({
          userId: p.userId,
          owedAmount: new Decimal(p.splitValue),
          splitValue: new Decimal(p.splitValue),
        }));
        break;
      }

      case "PERCENTAGES": {
        const totalPct = participants.reduce(
          (acc, p) => acc + p.splitValue,
          0
        );
        if (Math.abs(totalPct - 100) > 0.01) {
          return NextResponse.json(
            { error: "Percentages must sum to 100%" },
            { status: 400 }
          );
        }
        splits = participants.map((p) => ({
          userId: p.userId,
          owedAmount: total
            .times(new Decimal(p.splitValue))
            .dividedBy(100)
            .toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
          splitValue: new Decimal(p.splitValue),
        }));
        break;
      }

      case "SHARES": {
        const totalShares = participants.reduce(
          (acc, p) => acc + p.splitValue,
          0
        );
        if (totalShares === 0) {
          return NextResponse.json(
            { error: "Total shares must be greater than 0" },
            { status: 400 }
          );
        }
        splits = participants.map((p) => ({
          userId: p.userId,
          owedAmount: total
            .times(new Decimal(p.splitValue))
            .dividedBy(new Decimal(totalShares))
            .toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
          splitValue: new Decimal(p.splitValue),
        }));
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid split method" },
          { status: 400 }
        );
    }

    // Create expense and splits in a transaction
    const expense = await prisma.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          description,
          totalAmount: total,
          currency: currency ?? "USD",
          paidById,
          groupId: groupId ?? null,
          splitMethod,
          date: date ? new Date(date) : new Date(),
          notes: notes ?? null,
          createdById: session.user.id,
        },
      });

      await tx.expenseSplit.createMany({
        data: splits.map((s) => ({
          expenseId: newExpense.id,
          userId: s.userId,
          owedAmount: s.owedAmount,
          splitValue: s.splitValue,
        })),
      });

      return tx.expense.findUnique({
        where: { id: newExpense.id },
        include: {
          paidBy: { select: { id: true, name: true, avatarUrl: true } },
          splits: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          group: { select: { id: true, name: true } },
        },
      });
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error("Create expense error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
