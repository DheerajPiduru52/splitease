"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Trash2, ArrowLeft, Calendar, Users, Receipt } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface ExpenseSplit {
  id: string;
  userId: string;
  owedAmount: string;
  splitValue: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface Expense {
  id: string;
  description: string;
  totalAmount: string;
  currency: string;
  splitMethod: string;
  date: string;
  notes: string | null;
  createdAt: string;
  paidBy: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  createdBy: {
    id: string;
    name: string;
  };
  group: {
    id: string;
    name: string;
  } | null;
  splits: ExpenseSplit[];
}

const SPLIT_METHOD_LABELS: Record<string, string> = {
  EQUAL: "Split equally",
  EXACT_AMOUNTS: "Exact amounts",
  PERCENTAGES: "By percentage",
  SHARES: "By shares",
};

export default function ExpenseDetailPage() {
  const params = useParams();
  const expenseId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: expense, isLoading } = useQuery<Expense>({
    queryKey: ["expense", expenseId],
    queryFn: async () => {
      const res = await fetch(`/api/expenses/${expenseId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Expense deleted");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <p className="text-muted-foreground">Expense not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isCreator = expense.createdBy.id === user?.id;
  const totalAmount = parseFloat(expense.totalAmount);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold flex-1">{expense.description}</h1>
        {isCreator && (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Main card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">
                {formatCurrency(totalAmount, expense.currency)}
              </p>
              <Badge variant="secondary" className="mt-2">
                {SPLIT_METHOD_LABELS[expense.splitMethod] ?? expense.splitMethod}
              </Badge>
            </div>
            <Receipt className="h-10 w-10 text-muted-foreground opacity-30" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(expense.date)}</span>
            </div>
            {expense.group && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <Link href={`/groups/${expense.group.id}`} className="hover:text-foreground hover:underline">
                  {expense.group.name}
                </Link>
              </div>
            )}
          </div>

          {expense.notes && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                Notes
              </p>
              <p className="text-sm">{expense.notes}</p>
            </div>
          )}

          <Separator />

          {/* Paid by */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
              Paid by
            </p>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={expense.paidBy.avatarUrl ?? undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(expense.paidBy.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {expense.paidBy.id === user?.id ? "You" : expense.paidBy.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(totalAmount, expense.currency)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Splits */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">
              Split ({expense.splits.length} people)
            </p>
            <div className="space-y-3">
              {expense.splits.map((split) => {
                const owedAmount = parseFloat(split.owedAmount);
                const isPayer = split.userId === expense.paidBy.id;
                const isMe = split.userId === user?.id;

                return (
                  <div key={split.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={split.user.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(split.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {isMe ? "You" : split.user.name}
                        </p>
                        {isPayer && (
                          <p className="text-xs text-muted-foreground">paid</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(owedAmount, expense.currency)}
                      </p>
                      {!isPayer && isMe && (
                        <p className="text-xs text-red-600">you owe</p>
                      )}
                      {!isPayer && !isMe && expense.paidBy.id === user?.id && (
                        <p className="text-xs text-green-600">owes you</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          <p className="text-xs text-muted-foreground text-center">
            Created by {expense.createdBy.id === user?.id ? "you" : expense.createdBy.name}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
