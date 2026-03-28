import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
  avatarUrl: z.string().url("Invalid URL").optional().nullable(),
});

export const friendRequestSchema = z.object({
  addresseeId: z.string().uuid("Invalid user ID"),
});

export const respondToRequestSchema = z.object({
  friendshipId: z.string().uuid("Invalid friendship ID"),
  action: z.enum(["ACCEPT", "DECLINE"]),
});

export const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  memberIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

export const addGroupMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export const expenseParticipantSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  splitValue: z.number().min(0, "Split value must be non-negative"),
});

export const createExpenseSchema = z.object({
  description: z.string().min(1, "Description is required").max(200, "Description is too long"),
  totalAmount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3).default("USD"),
  paidById: z.string().uuid("Invalid payer ID"),
  groupId: z.string().uuid().optional().nullable(),
  splitMethod: z.enum(["EQUAL", "EXACT_AMOUNTS", "PERCENTAGES", "SHARES"]).default("EQUAL"),
  date: z.string().datetime().optional(),
  notes: z.string().max(500).optional().nullable(),
  participants: z
    .array(expenseParticipantSchema)
    .min(1, "At least one participant is required"),
});

export const updateExpenseSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  totalAmount: z.number().positive().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const createSettlementSchema = z.object({
  payeeId: z.string().uuid("Invalid payee ID"),
  amount: z.number().positive("Amount must be positive"),
  groupId: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type FriendRequestInput = z.infer<typeof friendRequestSchema>;
export type RespondToRequestInput = z.infer<typeof respondToRequestSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type AddGroupMemberInput = z.infer<typeof addGroupMemberSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
