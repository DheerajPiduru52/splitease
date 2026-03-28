"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { FriendSearch } from "@/components/FriendSearch";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { PlusCircle, UserPlus, LogOut, Receipt, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface GroupUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface GroupMember {
  id: string;
  userId: string;
  joinedAt: string;
  user: GroupUser;
}

interface ExpenseSplit {
  userId: string;
  owedAmount: string;
  user: { id: string; name: string };
}

interface Expense {
  id: string;
  description: string;
  totalAmount: string;
  currency: string;
  date: string;
  paidBy: { id: string; name: string; avatarUrl: string | null };
  splits: ExpenseSplit[];
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  createdBy: { id: string; name: string };
  members: GroupMember[];
  expenses: Expense[];
}

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const { data: group, isLoading } = useQuery<Group>({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const handleAddMember = async (selectedUser: { id: string; name: string }) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success(`${selectedUser.name} added to group`);
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      setAddMemberOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add member");
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Left group");
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      router.push("/groups");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave group");
    } finally {
      setLeaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Group not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/groups")}>
          Back to Groups
        </Button>
      </div>
    );
  }

  const isCreator = group.createdById === user?.id;
  const memberIds = group.members.map((m) => m.userId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          {group.description && (
            <p className="text-muted-foreground text-sm mt-1">{group.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            Created by {group.createdBy.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/expenses/new?groupId=${groupId}`}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Expense
            </Link>
          </Button>
          {!isCreator && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleLeave}
              disabled={leaving}
              title="Leave group"
            >
              {leaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Members */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Members ({group.members.length})
              </CardTitle>
              <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Member</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <FriendSearch
                      onSelect={handleAddMember}
                      excludeIds={memberIds}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.members.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.user.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(member.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                </div>
                {member.userId === group.createdById && (
                  <span className="text-xs text-muted-foreground">Admin</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Expenses */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Expenses ({group.expenses.length})
            </h2>
          </div>

          {group.expenses.length > 0 ? (
            <Card>
              <CardContent className="divide-y p-0">
                {group.expenses.map((expense) => (
                  <Link
                    key={expense.id}
                    href={`/expenses/${expense.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={expense.paidBy.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(expense.paidBy.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Paid by {expense.paidBy.id === user?.id ? "you" : expense.paidBy.name} &bull;{" "}
                          {formatDate(expense.date)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatCurrency(
                        parseFloat(expense.totalAmount),
                        expense.currency
                      )}
                    </p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-10">
                  <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">No expenses yet</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Add an expense to get started
                  </p>
                  <Button asChild size="sm">
                    <Link href={`/expenses/new?groupId=${groupId}`}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Expense
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
