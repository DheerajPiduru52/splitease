"use client";

import { useQuery } from "@tanstack/react-query";

export interface BalanceEntry {
  friendId: string;
  friendName: string;
  friendEmail: string;
  avatarUrl: string | null;
  netBalance: number;
}

async function fetchBalances(): Promise<BalanceEntry[]> {
  const res = await fetch("/api/balances");
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch balances");
  }
  return res.json();
}

async function fetchBalanceWithFriend(friendId: string): Promise<number> {
  const res = await fetch(`/api/balances/${friendId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch balance");
  }
  const data = await res.json();
  return data.netBalance;
}

export function useBalances() {
  return useQuery({
    queryKey: ["balances"],
    queryFn: fetchBalances,
    staleTime: 30_000,
  });
}

export function useBalanceWithFriend(friendId: string) {
  return useQuery({
    queryKey: ["balances", friendId],
    queryFn: () => fetchBalanceWithFriend(friendId),
    enabled: !!friendId,
    staleTime: 30_000,
  });
}
