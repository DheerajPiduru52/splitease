"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BasicInfoStep, type BasicInfo } from "@/components/expense-form/BasicInfoStep";
import { ParticipantStep, type ParticipantUser } from "@/components/expense-form/ParticipantStep";
import { SplitMethodStep, type SplitMethod, type SplitValue } from "@/components/expense-form/SplitMethodStep";
import { ReviewStep } from "@/components/expense-form/ReviewStep";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Friend {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface Group {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

const STEPS = ["Basic Info", "Participants", "Split", "Review"];

function NewExpenseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedGroupId = searchParams.get("groupId") ?? "";
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/users/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: friends = [] } = useQuery<Friend[]>({
    queryKey: ["friends"],
    queryFn: async () => {
      const res = await fetch("/api/friends");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    description: "",
    totalAmount: "",
    currency: "USD",
    date: format(new Date(), "yyyy-MM-dd"),
    paidById: "",
    groupId: preselectedGroupId || "none",
    notes: "",
  });

  // All possible participants (current user + friends)
  const allParticipants: ParticipantUser[] = [
    ...(profile ? [{ id: profile.id, name: profile.name, email: profile.email, avatarUrl: null }] : []),
    ...friends,
  ];

  // Start with current user selected
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>(
    profile ? [profile.id] : []
  );
  const [extraParticipants, setExtraParticipants] = useState<ParticipantUser[]>([]);

  // Set paidById to current user when profile loads
  useEffect(() => {
    if (profile && !basicInfo.paidById) {
      setBasicInfo((prev) => ({ ...prev, paidById: profile.id }));
      setSelectedParticipantIds([profile.id]);
    }
  }, [profile]);

  const [splitMethod, setSplitMethod] = useState<SplitMethod>("EQUAL");
  const [splitValues, setSplitValues] = useState<SplitValue[]>([]);
  const [basicErrors, setBasicErrors] = useState<Partial<Record<keyof BasicInfo, string>>>({});

  // Combine all participants (allParticipants + extra users added via search)
  const combinedParticipants = [
    ...allParticipants,
    ...extraParticipants.filter((ep) => !allParticipants.find((p) => p.id === ep.id)),
  ];

  const selectedParticipants = combinedParticipants.filter((p) =>
    selectedParticipantIds.includes(p.id)
  );

  // Sync split values when participants change
  useEffect(() => {
    const newValues: SplitValue[] = selectedParticipants.map((p) => {
      const existing = splitValues.find((sv) => sv.userId === p.id);
      return existing ?? { userId: p.id, splitValue: 1 };
    });
    setSplitValues(newValues);
  }, [selectedParticipantIds.join(",")]);

  const toggleParticipant = (userId: string) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const addExtraParticipant = (user: ParticipantUser) => {
    if (!extraParticipants.find((p) => p.id === user.id)) {
      setExtraParticipants((prev) => [...prev, user]);
    }
    if (!selectedParticipantIds.includes(user.id)) {
      setSelectedParticipantIds((prev) => [...prev, user.id]);
    }
  };

  const validateStep = (stepIndex: number): boolean => {
    if (stepIndex === 0) {
      const errors: typeof basicErrors = {};
      if (!basicInfo.description.trim()) errors.description = "Description is required";
      if (!basicInfo.totalAmount || parseFloat(basicInfo.totalAmount) <= 0)
        errors.totalAmount = "Enter a valid amount";
      if (!basicInfo.paidById) errors.paidById = "Select who paid";
      setBasicErrors(errors);
      return Object.keys(errors).length === 0;
    }
    if (stepIndex === 1) {
      return selectedParticipantIds.length > 0;
    }
    if (stepIndex === 2) {
      const total = parseFloat(basicInfo.totalAmount) || 0;
      if (splitMethod === "EXACT_AMOUNTS") {
        const sum = splitValues.reduce((s, v) => s + (v.splitValue || 0), 0);
        if (Math.abs(sum - total) > 0.01) return false;
      }
      if (splitMethod === "PERCENTAGES") {
        const sum = splitValues.reduce((s, v) => s + (v.splitValue || 0), 0);
        if (Math.abs(sum - 100) > 0.01) return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    } else if (step === 1) {
      toast.error("Please select at least one participant");
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const groupId = basicInfo.groupId !== "none" ? basicInfo.groupId : null;
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: basicInfo.description.trim(),
          totalAmount: parseFloat(basicInfo.totalAmount),
          currency: basicInfo.currency,
          paidById: basicInfo.paidById,
          groupId,
          splitMethod,
          date: new Date(basicInfo.date).toISOString(),
          notes: basicInfo.notes.trim() || null,
          participants: splitValues.map((sv) => ({
            userId: sv.userId,
            splitValue: sv.splitValue,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create expense");
      }

      const expense = await res.json();
      toast.success("Expense added successfully!");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      router.push(`/expenses/${expense.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create expense");
    } finally {
      setSubmitting(false);
    }
  };

  const payer = combinedParticipants.find((p) => p.id === basicInfo.paidById) ?? null;
  const groupName = groups.find((g) => g.id === basicInfo.groupId)?.name ?? null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Add Expense</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, idx) => (
          <div key={idx} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                "flex items-center justify-center h-7 w-7 rounded-full text-xs font-semibold transition-colors",
                idx < step
                  ? "bg-primary text-primary-foreground"
                  : idx === step
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {idx < step ? <Check className="h-3.5 w-3.5" /> : idx + 1}
            </div>
            <span
              className={cn(
                "text-xs hidden sm:block",
                idx === step ? "font-medium" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px",
                  idx < step ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <BasicInfoStep
              data={basicInfo}
              onChange={(updates) => setBasicInfo((prev) => ({ ...prev, ...updates }))}
              availablePayers={combinedParticipants.length > 0 ? combinedParticipants : (profile ? [profile] : [])}
              groups={groups}
              errors={basicErrors}
            />
          )}
          {step === 1 && profile && (
            <ParticipantStep
              currentUser={profile}
              allParticipants={combinedParticipants}
              selectedIds={selectedParticipantIds}
              onToggle={toggleParticipant}
              onAddUser={addExtraParticipant}
            />
          )}
          {step === 2 && (
            <SplitMethodStep
              participants={selectedParticipants}
              totalAmount={parseFloat(basicInfo.totalAmount) || 0}
              splitMethod={splitMethod}
              splitValues={splitValues}
              onMethodChange={setSplitMethod}
              onValuesChange={setSplitValues}
            />
          )}
          {step === 3 && (
            <ReviewStep
              basicInfo={basicInfo}
              participants={selectedParticipants}
              splitMethod={splitMethod}
              splitValues={splitValues}
              payer={payer}
              groupName={groupName}
            />
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <Button
            variant="outline"
            onClick={step === 0 ? () => router.back() : handleBack}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Expense
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function NewExpensePage() {
  return (
    <Suspense>
      <NewExpenseForm />
    </Suspense>
  );
}
