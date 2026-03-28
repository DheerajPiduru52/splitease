"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatCurrency, getInitials } from "@/lib/utils";
import Decimal from "decimal.js";
import { Equal, DollarSign, Percent, BarChart2 } from "lucide-react";

export type SplitMethod = "EQUAL" | "EXACT_AMOUNTS" | "PERCENTAGES" | "SHARES";

export interface SplitValue {
  userId: string;
  splitValue: number;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface SplitMethodStepProps {
  participants: Participant[];
  totalAmount: number;
  splitMethod: SplitMethod;
  splitValues: SplitValue[];
  onMethodChange: (method: SplitMethod) => void;
  onValuesChange: (values: SplitValue[]) => void;
}

const METHODS = [
  {
    id: "EQUAL" as SplitMethod,
    label: "Equal",
    icon: Equal,
    description: "Split equally among everyone",
  },
  {
    id: "EXACT_AMOUNTS" as SplitMethod,
    label: "Exact",
    icon: DollarSign,
    description: "Enter exact amounts for each person",
  },
  {
    id: "PERCENTAGES" as SplitMethod,
    label: "Percent",
    icon: Percent,
    description: "Split by percentage",
  },
  {
    id: "SHARES" as SplitMethod,
    label: "Shares",
    icon: BarChart2,
    description: "Split by number of shares",
  },
];

function calculateOwedAmounts(
  splitMethod: SplitMethod,
  splitValues: SplitValue[],
  totalAmount: number
): Map<string, number> {
  const total = new Decimal(totalAmount || 0);
  const result = new Map<string, number>();

  if (splitMethod === "EQUAL") {
    const count = splitValues.length;
    if (count === 0) return result;
    const base = total.dividedBy(count).toDecimalPlaces(2, Decimal.ROUND_FLOOR);
    const remainder = total.minus(base.times(count));
    const remainderCents = remainder.times(100).toDecimalPlaces(0).toNumber();
    splitValues.forEach((sv, i) => {
      result.set(sv.userId, base.plus(i < remainderCents ? new Decimal("0.01") : 0).toNumber());
    });
  } else if (splitMethod === "EXACT_AMOUNTS") {
    splitValues.forEach((sv) => result.set(sv.userId, sv.splitValue));
  } else if (splitMethod === "PERCENTAGES") {
    splitValues.forEach((sv) => {
      const owed = total.times(new Decimal(sv.splitValue || 0)).dividedBy(100)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      result.set(sv.userId, owed.toNumber());
    });
  } else if (splitMethod === "SHARES") {
    const totalShares = splitValues.reduce((s, sv) => s + (sv.splitValue || 0), 0);
    if (totalShares === 0) return result;
    splitValues.forEach((sv) => {
      const owed = total.times(new Decimal(sv.splitValue || 0)).dividedBy(new Decimal(totalShares))
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      result.set(sv.userId, owed.toNumber());
    });
  }

  return result;
}

function getValidationError(
  method: SplitMethod,
  values: SplitValue[],
  total: number
): string | null {
  if (method === "EXACT_AMOUNTS") {
    const sum = values.reduce((s, v) => s + (v.splitValue || 0), 0);
    const diff = Math.abs(sum - total);
    if (diff > 0.01) {
      return `Amounts sum to ${formatCurrency(sum)} but total is ${formatCurrency(total)}`;
    }
  } else if (method === "PERCENTAGES") {
    const sum = values.reduce((s, v) => s + (v.splitValue || 0), 0);
    if (Math.abs(sum - 100) > 0.01) {
      return `Percentages must sum to 100% (currently ${sum.toFixed(1)}%)`;
    }
  } else if (method === "SHARES") {
    const sum = values.reduce((s, v) => s + (v.splitValue || 0), 0);
    if (sum === 0) return "Total shares must be greater than 0";
  }
  return null;
}

export function SplitMethodStep({
  participants,
  totalAmount,
  splitMethod,
  splitValues,
  onMethodChange,
  onValuesChange,
}: SplitMethodStepProps) {
  const owedAmounts = calculateOwedAmounts(splitMethod, splitValues, totalAmount);
  const validationError = getValidationError(splitMethod, splitValues, totalAmount);

  const updateValue = (userId: string, value: number) => {
    onValuesChange(
      splitValues.map((sv) =>
        sv.userId === userId ? { ...sv, splitValue: value } : sv
      )
    );
  };

  return (
    <div className="space-y-5">
      {/* Method selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {METHODS.map((method) => {
          const Icon = method.icon;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onMethodChange(method.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-colors",
                splitMethod === method.id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:bg-accent"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{method.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {METHODS.find((m) => m.id === splitMethod)?.description}
      </p>

      {/* Validation error */}
      {validationError && (
        <p className="text-xs text-destructive font-medium">{validationError}</p>
      )}

      {/* Participant split inputs */}
      <div className="space-y-3">
        {participants.map((participant) => {
          const sv = splitValues.find((s) => s.userId === participant.id);
          const owed = owedAmounts.get(participant.id) ?? 0;

          return (
            <div key={participant.id} className="flex items-center gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={participant.avatarUrl ?? undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(participant.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{participant.name}</p>
                <p className="text-xs text-muted-foreground">
                  owes {formatCurrency(owed)}
                </p>
              </div>

              {splitMethod !== "EQUAL" && (
                <div className="relative w-28">
                  {splitMethod === "EXACT_AMOUNTS" && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                      $
                    </span>
                  )}
                  {splitMethod === "PERCENTAGES" && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                      %
                    </span>
                  )}
                  <Input
                    type="number"
                    min="0"
                    step={splitMethod === "SHARES" ? "1" : "0.01"}
                    value={sv?.splitValue ?? ""}
                    onChange={(e) =>
                      updateValue(participant.id, parseFloat(e.target.value) || 0)
                    }
                    className={cn(
                      "text-right text-sm h-8",
                      splitMethod === "EXACT_AMOUNTS" ? "pl-5" : "",
                      splitMethod === "PERCENTAGES" ? "pr-5" : ""
                    )}
                    placeholder={
                      splitMethod === "SHARES"
                        ? "1"
                        : splitMethod === "PERCENTAGES"
                        ? "0"
                        : "0.00"
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between pt-3 border-t">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-sm font-semibold">
          {formatCurrency(totalAmount)}
        </span>
      </div>
    </div>
  );
}
