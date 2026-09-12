"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, ApiClientError } from "@/lib/api/client";
import { useAuthStore, getStoredToken } from "@/lib/auth/authStore";
import { formatMoney } from "@/lib/format";
import { StatusMessage } from "@/components/StatusMessage";
import type { Earnings } from "@/lib/types/api";

export default function EarningsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  useEffect(() => {
    setMounted(false);
    useAuthStore.getState().hydrate();
    setMounted(true);
  }, []);

  const hasToken = Boolean(token || (typeof window !== "undefined" && getStoredToken()));

  const { data, isLoading, error } = useQuery<Earnings, ApiClientError>({
    queryKey: ["me", "earnings"],
    queryFn: async () => {
      const res = await api.get<Earnings>("/me/earnings");
      return res.data;
    },
    enabled: mounted && hasToken,
    retry: (failureCount, err) => {
      // Do not retry 401 or 403
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const handleSignOut = () => {
    signOut();
    router.push("/login");
  };

  // 1. Initial client-mount or query loading state
  if (!mounted || (hasToken && isLoading)) {
    return <StatusMessage state="loading" />;
  }

  // 2. Signed-out state (no token present or 401 unauthenticated response)
  const isSignedOut = !hasToken || (error instanceof ApiClientError && error.status === 401);
  if (isSignedOut) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Instructor Earnings</h1>
          <p className="mt-1 text-sm text-slate-500">View and manage your course revenue.</p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800 font-semibold">
            !
          </div>
          <h2 className="text-base font-semibold text-amber-900">Signed Out</h2>
          <p className="mt-1 text-sm text-amber-700">
            You must be signed in with an instructor account to view earnings.
          </p>
          <div className="mt-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Wrong role (403 Forbidden) state
  const isWrongRole = error instanceof ApiClientError && error.status === 403;
  if (isWrongRole) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Instructor Earnings</h1>
            <p className="mt-1 text-sm text-slate-500">
              Signed in as <span className="font-medium text-slate-900">{user?.name ?? "User"}</span> ({user?.role ?? "Learner"})
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-800 font-semibold">
            ✕
          </div>
          <h2 className="text-base font-semibold text-red-900">Access Denied (403 Forbidden)</h2>
          <p className="mt-1 text-sm text-red-700">
            {error.message || "Your account does not have instructor privileges to view earnings."}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Please sign in with an instructor account (<code className="font-mono">instructor@example.test</code>).
          </p>
        </div>
      </div>
    );
  }

  // Other unexpected errors (e.g. transport failure)
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Instructor Earnings</h1>
        <StatusMessage
          state="error"
          message={
            error instanceof ApiClientError && error.isTransportError
              ? `Connection error: ${error.message}`
              : error.message || "Failed to load earnings data."
          }
        />
      </div>
    );
  }

  // 4. Loaded state
  if (data) {
    const formattedLastWithdrawal = data.lastWithdrawalAt
      ? new Date(data.lastWithdrawalAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Never";

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Instructor Earnings</h1>
            <p className="mt-1 text-sm text-slate-500">
              Welcome back, <span className="font-medium text-slate-900">{user?.name ?? "Instructor"}</span>
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Available Balance
            </span>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatMoney(data.availableMinor, data.currency)}
            </div>
            <p className="mt-1 text-xs text-emerald-600">Available for withdrawal</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Balance
            </span>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatMoney(data.pendingMinor, data.currency)}
            </div>
            <p className="mt-1 text-xs text-slate-500">Held in escrow / clearing</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Last Withdrawal
            </span>
            <div className="mt-2 text-base font-semibold text-slate-900">
              {formattedLastWithdrawal}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Min withdrawal: {formatMoney(data.minimumWithdrawalMinor, data.currency)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <StatusMessage state="empty" message="No earnings data found." />;
}
