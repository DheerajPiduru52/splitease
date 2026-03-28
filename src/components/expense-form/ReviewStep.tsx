"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import Decimal from "decimal.js";
import type { BasicInfo } from "./BasicInfoStep";
import type { SplitMethod, SplitValue } from "./SplitMethodStep";

interface Participant {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface ReviewStepProps {
  basicInfo: BasicInfo;
  participants: Participant[];
  splitMethod: SplitMethod;
  splitValues: SplitValue[];
  payer: Participant | null;
  groupName: string | null;
}

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

const SPLIT_METHOD_LABELS: Record<SplitMethod, string> = {
  EQUAL: "Split equally",
  EXACT_AMOUNTS: "Exact amounts",
  PERCENTAGES: "By percentage",
  SHARES: "By shares",
};

export function ReviewStep({
  basicInfo,
  participants,
  splitMethod,
  splitValues,
  payer,
  groupName,
}: ReviewStepProps) {
  const total = parseFloat(basicInfo.totalAmount) || 0;
  const owedAmounts = calculateOwedAmounts(splitMethod, splitValues, total);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Expense Details
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Description</span>
            <span className="text-sm font-medium">{basicInfo.description}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Amount</span>
            <span className="text-sm font-semibold">
              {formatCurrency(total, basicInfo.currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Date</span>
            <span className="text-sm">{formatDate(basicInfo.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Paid by</span>
            <span className="text-sm font-medium">{payer?.name ?? "—"}</span>
          </div>
          {groupName && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Group</span>
              <span className="text-sm">{groupName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Split method</span>
            <span className="text-sm">{SPLIT_METHOD_LABELS[splitMethod]}</span>
          </div>
          {basicInfo.notes && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Notes</span>
              <span className="text-sm text-right max-w-xs">{basicInfo.notes}</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Split ({participants.length} people)
        </h3>
        <div className="space-y-3">
          {participants.map((participant) => {
            const owed = owedAmounts.get(participant.id) ?? 0;
            const isPayer = payer?.id === participant.id;

            return (
              <div key={participant.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={participant.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(participant.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{participant.name}</span>
                  {isPayer && (
                    <span className="text-xs text-muted-foreground">(payer)</span>
                  )}
                </div>
                <span className="text-sm font-medium">
                  {formatCurrency(owed, basicInfo.currency)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
