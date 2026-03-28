"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface Participant {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface Group {
  id: string;
  name: string;
}

export interface BasicInfo {
  description: string;
  totalAmount: string;
  currency: string;
  date: string;
  paidById: string;
  groupId: string;
  notes: string;
}

interface BasicInfoStepProps {
  data: BasicInfo;
  onChange: (data: Partial<BasicInfo>) => void;
  availablePayers: Participant[];
  groups: Group[];
  errors: Partial<Record<keyof BasicInfo, string>>;
}

export function BasicInfoStep({
  data,
  onChange,
  availablePayers,
  groups,
  errors,
}: BasicInfoStepProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Input
          id="description"
          placeholder="e.g. Dinner at restaurant"
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className={errors.description ? "border-destructive" : ""}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {data.currency === "USD" ? "$" : data.currency === "EUR" ? "€" : data.currency === "GBP" ? "£" : "$"}
            </span>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={data.totalAmount}
              onChange={(e) => onChange({ totalAmount: e.target.value })}
              className={`pl-7 ${errors.totalAmount ? "border-destructive" : ""}`}
            />
          </div>
          {errors.totalAmount && (
            <p className="text-xs text-destructive">{errors.totalAmount}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={data.currency}
            onValueChange={(value) => onChange({ currency: value })}
          >
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
              <SelectItem value="CAD">CAD</SelectItem>
              <SelectItem value="AUD">AUD</SelectItem>
              <SelectItem value="INR">INR (₹)</SelectItem>
              <SelectItem value="JPY">JPY (¥)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={data.date}
          onChange={(e) => onChange({ date: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="paidBy">Paid by *</Label>
        <Select
          value={data.paidById}
          onValueChange={(value) => onChange({ paidById: value })}
        >
          <SelectTrigger id="paidBy" className={errors.paidById ? "border-destructive" : ""}>
            <SelectValue placeholder="Who paid?" />
          </SelectTrigger>
          <SelectContent>
            {availablePayers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={p.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(p.name)}
                    </AvatarFallback>
                  </Avatar>
                  {p.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.paidById && (
          <p className="text-xs text-destructive">{errors.paidById}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="group">Group (optional)</Label>
        <Select
          value={data.groupId}
          onValueChange={(value) => onChange({ groupId: value })}
        >
          <SelectTrigger id="group">
            <SelectValue placeholder="No group (personal)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No group</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Any additional details..."
          value={data.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="resize-none"
          rows={2}
        />
      </div>
    </div>
  );
}
