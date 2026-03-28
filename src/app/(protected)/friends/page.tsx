"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FriendSearch } from "@/components/FriendSearch";
import { formatCurrency, getInitials, cn } from "@/lib/utils";
import { useBalances } from "@/hooks/useBalances";
import { UserPlus, Check, X, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Friend {
  friendshipId: string;
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface FriendRequest {
  id: string;
  requester: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

export default function FriendsPage() {
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: friends, isLoading: friendsLoading } = useQuery<Friend[]>({
    queryKey: ["friends"],
    queryFn: async () => {
      const res = await fetch("/api/friends");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: requests, isLoading: requestsLoading } = useQuery<FriendRequest[]>({
    queryKey: ["friend-requests"],
    queryFn: async () => {
      const res = await fetch("/api/friends/requests");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: balances } = useBalances();

  const getBalance = (friendId: string) => {
    return balances?.find((b) => b.friendId === friendId)?.netBalance ?? 0;
  };

  const handleRespond = async (
    friendshipId: string,
    action: "ACCEPT" | "DECLINE"
  ) => {
    setRespondingTo(friendshipId);
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success(action === "ACCEPT" ? "Friend request accepted!" : "Friend request declined");
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to respond");
    } finally {
      setRespondingTo(null);
    }
  };

  const friendIds = friends?.map((f) => f.id) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Friends</h1>
        <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Friend
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a Friend</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <FriendSearch addFriendMode excludeIds={friendIds} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Requests */}
      {(requestsLoading || (requests && requests.length > 0)) && (
        <section>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            Pending Requests
            {requests && requests.length > 0 && (
              <Badge variant="secondary">{requests.length}</Badge>
            )}
          </h2>

          {requestsLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="divide-y p-0">
                {requests?.map((req) => (
                  <div key={req.id} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={req.requester.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(req.requester.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{req.requester.name}</p>
                        <p className="text-xs text-muted-foreground">{req.requester.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRespond(req.id, "ACCEPT")}
                        disabled={respondingTo === req.id}
                      >
                        {respondingTo === req.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        <span className="ml-1.5 hidden sm:inline">Accept</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRespond(req.id, "DECLINE")}
                        disabled={respondingTo === req.id}
                      >
                        <X className="h-3 w-3" />
                        <span className="ml-1.5 hidden sm:inline">Decline</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Friends List */}
      <section>
        <h2 className="text-base font-semibold mb-3">
          My Friends {friends && `(${friends.length})`}
        </h2>

        {friendsLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : friends && friends.length > 0 ? (
          <Card>
            <CardContent className="divide-y p-0">
              {friends.map((friend) => {
                const balance = getBalance(friend.id);
                return (
                  <div key={friend.id} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={friend.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(friend.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{friend.name}</p>
                        <p className="text-xs text-muted-foreground">{friend.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {balance !== 0 ? (
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            balance > 0 ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {balance > 0
                            ? `owes you ${formatCurrency(balance)}`
                            : `you owe ${formatCurrency(Math.abs(balance))}`}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">settled up</p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-7 text-xs"
                        asChild
                      >
                        <Link href={`/settle?friendId=${friend.id}`}>
                          Settle up
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                <p className="text-sm font-medium">No friends yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Add friends to start splitting expenses together
                </p>
                <Button onClick={() => setAddFriendOpen(true)} size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add your first friend
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
