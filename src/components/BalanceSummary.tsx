"use client";

import { useBalances } from "@/hooks/useBalances";
import { cn, formatCurrency, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function BalanceSummary() {
  const { data: balances, isLoading, error } = useBalances();

  const totalOwed = balances?.reduce(
    (sum, b) => (b.netBalance > 0 ? sum + b.netBalance : sum),
    0
  ) ?? 0;

  const totalOwe = balances?.reduce(
    (sum, b) => (b.netBalance < 0 ? sum + Math.abs(b.netBalance) : sum),
    0
  ) ?? 0;

  const netTotal = totalOwed - totalOwe;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">Failed to load balances.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p
                  className={cn(
                    "text-2xl font-bold mt-1",
                    netTotal > 0
                      ? "text-green-600"
                      : netTotal < 0
                      ? "text-red-600"
                      : "text-foreground"
                  )}
                >
                  {netTotal >= 0 ? "+" : "-"}
                  {formatCurrency(Math.abs(netTotal))}
                </p>
              </div>
              {netTotal > 0 ? (
                <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
              ) : netTotal < 0 ? (
                <TrendingDown className="h-8 w-8 text-red-600 opacity-50" />
              ) : (
                <Minus className="h-8 w-8 text-muted-foreground opacity-50" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">You are owed</p>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  {formatCurrency(totalOwed)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">You owe</p>
                <p className="text-2xl font-bold mt-1 text-red-600">
                  {formatCurrency(totalOwe)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-friend balances */}
      {balances && balances.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Balances with friends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {balances.map((balance) => (
              <div
                key={balance.friendId}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={balance.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(balance.friendName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{balance.friendName}</p>
                    <p className="text-xs text-muted-foreground">
                      {balance.friendEmail}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      balance.netBalance > 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {balance.netBalance > 0
                      ? `owes you ${formatCurrency(balance.netBalance)}`
                      : `you owe ${formatCurrency(Math.abs(balance.netBalance))}`}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Minus className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">All settled up!</p>
            <p className="text-xs text-muted-foreground mt-1">
              No outstanding balances with friends.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
