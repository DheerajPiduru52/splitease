"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface UserResult {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface FriendSearchProps {
  onSelect?: (user: UserResult) => void;
  excludeIds?: string[];
  addFriendMode?: boolean;
}

export function FriendSearch({ onSelect, excludeIds = [], addFriendMode = false }: FriendSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleSearch = useCallback(async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(value)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.filter((u: UserResult) => !excludeIds.includes(u.id)));
    } catch {
      toast.error("Search failed. Please try again.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [excludeIds]);

  const handleSendRequest = async (userId: string) => {
    setSendingRequest(userId);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresseeId: userId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send request");
      }
      toast.success("Friend request sent!");
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      setResults((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send request");
    } finally {
      setSendingRequest(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <div className="border rounded-lg divide-y overflow-hidden">
          {results.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-card hover:bg-accent transition-colors">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {addFriendMode ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendRequest(user.id)}
                  disabled={sendingRequest === user.id}
                >
                  {sendingRequest === user.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <UserPlus className="h-3 w-3" />
                  )}
                  <span className="ml-1.5">Add</span>
                </Button>
              ) : onSelect ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onSelect(user);
                    setQuery("");
                    setResults([]);
                  }}
                >
                  Select
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && results.length === 0 && !searching && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No users found matching &quot;{query}&quot;
        </p>
      )}
    </div>
  );
}
