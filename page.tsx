"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ReservationResponse } from "@/types";

// Fetch reservation details from a lightweight local endpoint
async function fetchReservation(id: string): Promise<ReservationResponse> {
  const res = await fetch(`/api/reservations/${id}`);
  if (!res.ok) throw new Error("Reservation not found");
  return res.json();
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, secondsLeft]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const urgent = secondsLeft < 60;

  return (
    <span
      className={`font-mono text-2xl font-bold ${
        urgent ? "text-red-600 animate-pulse" : "text-indigo-600"
      }`}
    >
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

export default function CheckoutPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<"confirm" | "cancel" | null>(null);

  const load = useCallback(async () => {
    try {
      setReservation(await fetchReservation(id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error loading reservation");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConfirm() {
    setActionPending("confirm");
    setActionError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, {
        method: "POST",
      });
      if (res.status === 410) {
        setActionError("This reservation has expired. Your hold has been released.");
        await load();
        return;
      }
      if (!res.ok) {
        const body = await res.json();
        setActionError(body.error ?? "Confirm failed");
        return;
      }
      await load(); // refresh state without page reload
    } finally {
      setActionPending(null);
    }
  }

  async function handleCancel() {
    setActionPending("cancel");
    setActionError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/release`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json();
        setActionError(body.error ?? "Cancel failed");
        return;
      }
      await load();
    } finally {
      setActionPending(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-red-600 font-medium">{error ?? "Reservation not found."}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          ← Back to products
        </button>
      </div>
    );
  }

  const isExpired =
    reservation.status === "PENDING" &&
    new Date(reservation.expiresAt) < new Date();

  const statusConfig: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    PENDING: { label: "Pending", color: "text-yellow-700", bg: "bg-yellow-100" },
    CONFIRMED: { label: "Confirmed ✓", color: "text-green-700", bg: "bg-green-100" },
    RELEASED: { label: "Released", color: "text-gray-600", bg: "bg-gray-100" },
  };

  const statusDisplay = statusConfig[reservation.status] ?? {
    label: reservation.status,
    color: "text-gray-600",
    bg: "bg-gray-100",
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <button
        onClick={() => router.push("/")}
        className="text-sm text-indigo-600 hover:underline mb-6 block"
      >
        ← Back to products
      </button>

      <div className="bg-white rounded-2xl border shadow-sm p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-500 text-sm mt-0.5">Reservation #{id.slice(-8)}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${statusDisplay.bg} ${statusDisplay.color}`}
          >
            {statusDisplay.label}
          </span>
        </div>

        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex justify-between">
            <span className="text-gray-500">Product</span>
            <span className="font-medium">{reservation.productName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Warehouse</span>
            <span className="font-medium">{reservation.warehouseName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Quantity</span>
            <span className="font-medium">{reservation.quantity}</span>
          </div>
        </div>

        {reservation.status === "PENDING" && !isExpired && (
          <div className="border rounded-xl p-4 bg-indigo-50 flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-700 font-medium">Hold expires in</p>
              <p className="text-xs text-indigo-500 mt-0.5">
                Complete payment before time runs out
              </p>
            </div>
            <Countdown expiresAt={reservation.expiresAt} />
          </div>
        )}

        {(isExpired || reservation.status === "RELEASED") && (
          <div className="border border-red-200 rounded-xl p-4 bg-red-50">
            <p className="text-sm text-red-700 font-medium">
              {isExpired
                ? "This reservation has expired."
                : "This reservation was cancelled."}
            </p>
            <p className="text-xs text-red-500 mt-1">
              The units have been returned to available stock.
            </p>
          </div>
        )}

        {reservation.status === "CONFIRMED" && (
          <div className="border border-green-200 rounded-xl p-4 bg-green-50">
            <p className="text-sm text-green-700 font-semibold">
              Payment confirmed!
            </p>
            <p className="text-xs text-green-600 mt-1">
              Your order has been placed successfully.
            </p>
          </div>
        )}

        {actionError && (
          <div className="border border-red-200 rounded-xl p-3 bg-red-50">
            <p className="text-sm text-red-700">{actionError}</p>
          </div>
        )}

        {reservation.status === "PENDING" && !isExpired && (
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleConfirm}
              disabled={!!actionPending}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionPending === "confirm" ? "Confirming..." : "Confirm purchase"}
            </button>
            <button
              onClick={handleCancel}
              disabled={!!actionPending}
              className="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionPending === "cancel" ? "..." : "Cancel"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
