"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { FriendSearch } from "@/components/FriendSearch";
import { getInitials } from "@/lib/utils";
import { Users, PlusCircle, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface GroupMemberUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
  members: { user: GroupMemberUser }[];
  _count: { members: number; expenses: number };
}

interface SelectedUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export default function GroupsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<SelectedUser[]>([]);
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const handleAddMember = (user: SelectedUser) => {
    if (!selectedMembers.find((m) => m.id === user.id)) {
      setSelectedMembers((prev) => [...prev, user]);
    }
  };

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDesc.trim() || undefined,
          memberIds: selectedMembers.map((m) => m.id),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success("Group created!");
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setCreateOpen(false);
      setGroupName("");
      setGroupDesc("");
      setSelectedMembers([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create a Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  placeholder="e.g. Roommates, Trip to Paris"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-desc">Description (optional)</Label>
                <Textarea
                  id="group-desc"
                  placeholder="What's this group for?"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
              </div>

              {/* Selected members */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1 text-sm"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={m.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(m.name)}
                        </AvatarFallback>
                      </Avatar>
                      {m.name}
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="ml-1 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Add Members</Label>
                <FriendSearch
                  onSelect={handleAddMember}
                  excludeIds={selectedMembers.map((m) => m.id)}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Group"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : groups && groups.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{group.name}</h3>
                      {group.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex -space-x-2">
                      {group.members.slice(0, 4).map((m, idx) => (
                        <Avatar key={idx} className="h-7 w-7 border-2 border-background">
                          <AvatarImage src={m.user.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(m.user.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {group._count.members > 4 && (
                        <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium">
                          +{group._count.members - 4}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      <p>{group._count.members} members</p>
                      <p>{group._count.expenses} expenses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-sm font-medium">No groups yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Create a group to split expenses with multiple people
              </p>
              <Button onClick={() => setCreateOpen(true)} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create your first group
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
