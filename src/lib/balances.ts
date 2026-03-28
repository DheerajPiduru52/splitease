import Decimal from "decimal.js";
import { prisma } from "./prisma";

export interface BalanceEntry {
  friendId: string;
  friendName: string;
  friendEmail: string;
  avatarUrl: string | null;
  netBalance: number; // positive = friend owes user, negative = user owes friend
}

/**
 * Distribute an amount equally among `count` people, handling remainder by
 * adding 1 cent to the first recipients.
 */
export function distributeAmount(total: Decimal, count: number): Decimal[] {
  if (count === 0) return [];
  const base = total.dividedBy(count).toDecimalPlaces(2, Decimal.ROUND_FLOOR);
  const remainder = total.minus(base.times(count));
  const remainderCents = remainder.times(100).toDecimalPlaces(0).toNumber();

  return Array.from({ length: count }, (_, i) => {
    if (i < remainderCents) {
      return base.plus(new Decimal("0.01"));
    }
    return base;
  });
}

/**
 * Calculate net balances for a given user across all expenses and settlements.
 * Returns a map of friendId -> BalanceEntry.
 * Positive netBalance = friend owes the user.
 * Negative netBalance = user owes the friend.
 */
export async function calculateBalances(userId: string): Promise<BalanceEntry[]> {
  // Get all expenses where user is involved (either as payer or split participant)
  const expensesAsPayer = await prisma.expense.findMany({
    where: { paidById: userId },
    include: {
      splits: {
        include: { user: true },
      },
    },
  });

  const expensesAsSplitParticipant = await prisma.expense.findMany({
    where: {
      splits: { some: { userId } },
      paidById: { not: userId },
    },
    include: {
      paidBy: true,
      splits: {
        where: { userId },
      },
    },
  });

  // Get all settlements involving user
  const settlementsAsPayer = await prisma.settlement.findMany({
    where: { payerId: userId },
    include: { payee: true },
  });

  const settlementsAsPayee = await prisma.settlement.findMany({
    where: { payeeId: userId },
    include: { payer: true },
  });

  // Build balance map: friendId -> netBalance (in cents to avoid floating point)
  const balanceMap = new Map<string, Decimal>();
  const friendInfoMap = new Map<
    string,
    { name: string; email: string; avatarUrl: string | null }
  >();

  const addBalance = (friendId: string, amount: Decimal) => {
    const current = balanceMap.get(friendId) ?? new Decimal(0);
    balanceMap.set(friendId, current.plus(amount));
  };

  // Expenses where user paid: others owe user their split amount
  for (const expense of expensesAsPayer) {
    for (const split of expense.splits) {
      if (split.userId === userId) continue; // user's own share, skip
      const owedToUser = new Decimal(split.owedAmount.toString());
      addBalance(split.userId, owedToUser);
      if (!friendInfoMap.has(split.userId)) {
        friendInfoMap.set(split.userId, {
          name: split.user.name,
          email: split.user.email,
          avatarUrl: split.user.avatarUrl,
        });
      }
    }
  }

  // Expenses where someone else paid: user owes payer their split amount
  for (const expense of expensesAsSplitParticipant) {
    const userSplit = expense.splits[0];
    if (!userSplit) continue;
    const owedByUser = new Decimal(userSplit.owedAmount.toString()).negated();
    addBalance(expense.paidById, owedByUser);
    if (!friendInfoMap.has(expense.paidById)) {
      friendInfoMap.set(expense.paidById, {
        name: expense.paidBy.name,
        email: expense.paidBy.email,
        avatarUrl: expense.paidBy.avatarUrl,
      });
    }
  }

  // Settlements where user paid someone: reduces what user owes that person (or increases what they owe user)
  for (const settlement of settlementsAsPayer) {
    const amount = new Decimal(settlement.amount.toString());
    // User paid payee -> user's debt to payee decreases (or payee's debt to user increases)
    addBalance(settlement.payeeId, amount);
    if (!friendInfoMap.has(settlement.payeeId)) {
      friendInfoMap.set(settlement.payeeId, {
        name: settlement.payee.name,
        email: settlement.payee.email,
        avatarUrl: settlement.payee.avatarUrl,
      });
    }
  }

  // Settlements where user received payment: reduces what friend owes user
  for (const settlement of settlementsAsPayee) {
    const amount = new Decimal(settlement.amount.toString());
    // Payer paid user -> payer's debt to user decreases
    addBalance(settlement.payerId, amount.negated());
    if (!friendInfoMap.has(settlement.payerId)) {
      friendInfoMap.set(settlement.payerId, {
        name: settlement.payer.name,
        email: settlement.payer.email,
        avatarUrl: settlement.payer.avatarUrl,
      });
    }
  }

  const result: BalanceEntry[] = [];
  for (const [friendId, netBalance] of balanceMap.entries()) {
    // Only include non-zero balances
    if (netBalance.equals(0)) continue;
    const info = friendInfoMap.get(friendId);
    if (!info) continue;
    result.push({
      friendId,
      friendName: info.name,
      friendEmail: info.email,
      avatarUrl: info.avatarUrl,
      netBalance: netBalance.toNumber(),
    });
  }

  return result;
}

/**
 * Calculate balance between two specific users.
 */
export async function calculateBalanceBetween(
  userId: string,
  friendId: string
): Promise<number> {
  const balances = await calculateBalances(userId);
  const entry = balances.find((b) => b.friendId === friendId);
  return entry?.netBalance ?? 0;
}
