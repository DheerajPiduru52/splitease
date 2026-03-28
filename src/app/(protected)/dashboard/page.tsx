"use client";

import { useQuery } from "@tanstack/react-query";
import { BalanceSummary } from "@/components/BalanceSummary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import Link from "next/link";
import { PlusCircle, ArrowRight, Receipt } from "lucide-react";

interface Expense {
  id: string;
  description: string;
  totalAmount: string;
  currency: string;
  date: string;
  paidBy: { id: string; name: string; avatarUrl: string | null };
  group: { id: string; name: string } | null;
  splits: { userId: string; owedAmount: string }[];
}

interface Profile {
  id: string;
  name: string;
  email: string;
}

export default function DashboardPage() {
  const { data: profile } = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/users/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["expenses", "recent"],
    queryFn: async () => {
      const res = await fetch("/api/expenses?limit=10");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {greeting()}{profile ? `, ${profile.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here&apos;s a summary of your expenses and balances.
          </p>
        </div>
        <Button asChild>
          <Link href="/expenses/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Expense
          </Link>
        </Button>
      </div>

      {/* Balance Summary */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Balances</h2>
        <BalanceSummary />
      </section>

      {/* Recent Expenses */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Expenses</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/expenses/new" className="text-sm text-muted-foreground">
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>

        {expensesLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : expenses && expenses.length > 0 ? (
          <Card>
            <CardContent className="divide-y p-0">
              {expenses.map((expense) => {
                const myShare = expense.splits.find(
                  (s) => s.userId === profile?.id
                );
                const iPaid = expense.paidBy.id === profile?.id;

                return (
                  <Link
                    key={expense.id}
                    href={`/expenses/${expense.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={expense.paidBy.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(expense.paidBy.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {expense.paidBy.id === profile?.id ? "You" : expense.paidBy.name} paid &bull;{" "}
                          {formatDate(expense.date)}
                          {expense.group && (
                            <span className="ml-1 text-primary">
                              &bull; {expense.group.name}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(parseFloat(expense.totalAmount), expense.currency)}
                      </p>
                      {myShare && !iPaid && (
                        <p className="text-xs text-red-600">
                          you owe {formatCurrency(parseFloat(myShare.owedAmount))}
                        </p>
                      )}
                      {iPaid && myShare && expense.splits.length > 1 && (
                        <p className="text-xs text-green-600">
                          you paid
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                <p className="text-sm font-medium">No expenses yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Add your first expense to get started
                </p>
                <Button asChild size="sm">
                  <Link href="/expenses/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Expense
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
