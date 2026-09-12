"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiClientError } from "@/lib/api/client";
import { formatMoney } from "@/lib/format";

type WithdrawalFormProps = {
  availableMinor: number;
  minimumWithdrawalMinor: number;
  currency: string;
};

export function WithdrawalForm({
  availableMinor,
  minimumWithdrawalMinor,
  currency,
}: WithdrawalFormProps) {
  const queryClient = useQueryClient();
  const [payoutReference, setPayoutReference] = useState<string | null>(null);

  const formSchema = z.object({
    amountMinor: z.coerce
      .number({ invalid_type_error: "Amount is required" })
      .int("Amount must be a whole number")
      .min(minimumWithdrawalMinor, `Minimum withdrawal is ${formatMoney(minimumWithdrawalMinor, currency)}`)
      .max(availableMinor, `You cannot withdraw more than your available balance.`),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amountMinor: undefined,
    },
    mode: "onChange",
  });

  const mutation = useMutation({
    mutationFn: async (payload: { amountMinor: number; payoutReference: string }) => {
      const res = await api.post("/me/withdrawals", payload, {
        headers: { "Idempotency-Key": payload.payoutReference },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "earnings"] });
      form.reset({ amountMinor: undefined });
      setPayoutReference(null); // Reset for the next withdrawal attempt
    },
    onError: (err) => {
      if (err instanceof ApiClientError && err.status === 422) {
        form.setError("amountMinor", { message: err.message });
      } else if (err instanceof ApiClientError) {
        form.setError("root", { message: err.message });
      } else {
        form.setError("root", { message: "An unexpected error occurred." });
      }
    },
  });

  const onSubmit = (values: FormValues) => {
    let currentRef = payoutReference;
    if (!currentRef) {
      currentRef = `wd_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
      setPayoutReference(currentRef);
    }
    mutation.mutate({
      amountMinor: values.amountMinor,
      payoutReference: currentRef,
    });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Request Withdrawal</h2>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <div>
          <label htmlFor="amountMinor" className="block text-sm font-medium text-slate-700">
            Amount (in minor units, e.g. cents)
          </label>
          <div className="mt-1">
            <input
              id="amountMinor"
              type="number"
              {...form.register("amountMinor")}
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              placeholder={`e.g. ${minimumWithdrawalMinor}`}
              disabled={mutation.isPending}
            />
          </div>
          {form.formState.errors.amountMinor && (
            <p className="mt-2 text-sm text-red-600">
              {form.formState.errors.amountMinor.message}
            </p>
          )}
        </div>
        
        {form.formState.errors.root && (
          <p className="mt-2 text-sm text-red-600">
            {form.formState.errors.root.message}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending || !form.formState.isValid}
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? "Processing..." : "Withdraw Funds"}
        </button>
      </form>
    </div>
  );
}
