"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FriendSearch } from "@/components/FriendSearch";
import { getInitials } from "@/lib/utils";

export interface ParticipantUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface ParticipantStepProps {
  currentUser: ParticipantUser;
  allParticipants: ParticipantUser[];
  selectedIds: string[];
  onToggle: (userId: string) => void;
  onAddUser: (user: ParticipantUser) => void;
}

export function ParticipantStep({
  currentUser,
  allParticipants,
  selectedIds,
  onToggle,
  onAddUser,
}: ParticipantStepProps) {
  const existingIds = allParticipants.map((p) => p.id);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select who is involved in this expense.
      </p>

      <div className="space-y-2">
        {allParticipants.map((participant) => {
          const isMe = participant.id === currentUser.id;
          const isSelected = selectedIds.includes(participant.id);

          return (
            <div
              key={participant.id}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => onToggle(participant.id)}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggle(participant.id)}
                id={`participant-${participant.id}`}
              />
              <Avatar className="h-8 w-8">
                <AvatarImage src={participant.avatarUrl ?? undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(participant.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <Label
                  htmlFor={`participant-${participant.id}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {isMe ? "You" : participant.name}
                </Label>
                <p className="text-xs text-muted-foreground truncate">
                  {participant.email}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t pt-4">
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Add someone not in your friends list
        </p>
        <FriendSearch
          onSelect={onAddUser}
          excludeIds={existingIds}
        />
      </div>

      {selectedIds.length === 0 && (
        <p className="text-xs text-destructive">
          Please select at least one participant
        </p>
      )}
    </div>
  );
}
