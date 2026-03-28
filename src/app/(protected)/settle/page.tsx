"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBalances } from "@/hooks/useBalances";
import { formatCurrency, getInitials, cn } from "@/lib/utils";
import { ArrowRight, Loader2, Check, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";

interface Friend {
  friendshipId: string;
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export default function SettlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedFriendId = searchParams.get("friendId") ?? "";
  const queryClient = useQueryClient();

  const [selectedFriendId, setSelectedFriendId] = useState(preselectedFriendId);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: friends = [], isLoading: friendsLoading } = useQuery<Friend[]>({
    queryKey: ["friends"],
    queryFn: async () => {
      const res = await fetch("/api/friends");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: balances } = useBalances();

  const selectedFriend = friends.find((f) => f.id === selectedFriendId);
  const balance = balances?.find((b) => b.friendId === selectedFriendId);

  // Auto-fill suggested amount
  useEffect(() => {
    if (balance && !amount) {
      const suggested = Math.abs(balance.netBalance);
      if (suggested > 0) {
        setAmount(suggested.toFixed(2));
      }
    }
  }, [selectedFriendId, balance]);

  const handleSubmit = async () => {
    if (!selectedFriendId) {
      toast.error("Please select a friend");
      return;
    }
    const amountNum = parseFloat(amount);
    if (!amount || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payeeId: selectedFriendId,
          amount: amountNum,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success(`Payment of ${formatCurrency(amountNum)} recorded!`);
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record settlement");
    } finally {
      setSubmitting(false);
    }
  };

  const amountNum = parseFloat(amount) || 0;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settle Up</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Record a payment you made to a friend
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Friend selector */}
          <div className="space-y-2">
            <Label>Pay to</Label>
            <Select
              value={selectedFriendId}
              onValueChange={(val) => {
                setSelectedFriendId(val);
                setAmount("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a friend" />
              </SelectTrigger>
              <SelectContent>
                {friendsLoading ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
                ) : friends.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No friends yet</div>
                ) : (
                  friends.map((f) => {
                    const b = balances?.find((b) => b.friendId === f.id);
                    return (
                      <SelectItem key={f.id} value={f.id}>
                        <div className="flex items-center gap-2">
                          <span>{f.name}</span>
                          {b && b.netBalance !== 0 && (
                            <span
                              className={cn(
                                "text-xs",
                                b.netBalance > 0 ? "text-green-600" : "text-red-600"
                              )}
                            >
                              ({b.netBalance > 0
                                ? `owes you ${formatCurrency(b.netBalance)}`
                                : `you owe ${formatCurrency(Math.abs(b.netBalance))}`})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Balance summary */}
          {selectedFriend && balance && (
            <div
              className={cn(
                "rounded-lg p-3 text-sm flex items-center justify-between",
                balance.netBalance < 0
                  ? "bg-red-50 border border-red-100"
                  : balance.netBalance > 0
                  ? "bg-green-50 border border-green-100"
                  : "bg-muted"
              )}
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={selectedFriend.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(selectedFriend.name)}
                  </AvatarFallback>
                </Avatar>
                <span>{selectedFriend.name}</span>
              </div>
              <span
                className={cn(
                  "font-semibold",
                  balance.netBalance < 0 ? "text-red-600" : "text-green-600"
                )}
              >
                {balance.netBalance < 0
                  ? `You owe ${formatCurrency(Math.abs(balance.netBalance))}`
                  : `Owes you ${formatCurrency(balance.netBalance)}`}
              </span>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
              />
            </div>
            {balance && balance.netBalance !== 0 && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setAmount(Math.abs(balance.netBalance).toFixed(2))}
              >
                Use full amount ({formatCurrency(Math.abs(balance.netBalance))})
              </Button>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g. Cash payment, bank transfer"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Summary */}
          {selectedFriend && amountNum > 0 && (
            <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-lg text-sm">
              <span className="font-medium">You</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-primary">
                {formatCurrency(amountNum)}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{selectedFriend.name}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4 gap-3">
          <Button variant="outline" onClick={() => router.back()} className="flex-1">
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={submitting || !selectedFriendId || amountNum <= 0}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Record Payment
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
