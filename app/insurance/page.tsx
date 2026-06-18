"use client";

/**
 * @module Insurance
 *
 * Micro-insurance management page.
 *
 * Flow:
 *  1. PageHeader "New Policy" CTA toggles `showForm` to reveal `NewPolicyForm`.
 *  2. Form submits via `useFormAction<AddInsuranceResponse>("/api/insurance")`.
 *  3. On success the new policy is **optimistically prepended** to the local list
 *     so the user sees it immediately without a full refetch.
 *  4. `AsyncSubmissionStatus` reflects pending / error / success states inline.
 *  5. Validation errors surface at field level via `state.validationErrors`.
 *  6. All copy is externalised through `useClientTranslator` (en / es).
 *  7. Empty-state, reduced-motion, and mobile viewports are handled.
 */

import { useRef, useState, useId, useEffect } from "react";
import {
  Loader2,
  Shield,
  CalendarClock,
  ShieldCheck,
  Info,
  Plus,
  ChevronUp,
} from "lucide-react";

import { ActionState } from "@/lib/auth/middleware";
import { useFormAction } from "@/lib/hooks/useFormAction";
import { getPolicyPaymentPresentation } from "@/lib/ui/status-semantics";
import { useClientTranslator } from "@/lib/i18n/client";
import PageHeader from "@/components/PageHeader";
import AsyncSubmissionStatus from "@/components/AsyncSubmissionStatus";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape returned by POST /api/insurance */
type AddInsuranceResponse = ActionState & {
  policyName?: string;
  coverageAmount?: number;
  monthlyPremium?: number;
  coverageType?: string;
};

/** Matches lib/contracts/insurance.ts Policy interface */
interface Policy {
  id: string;
  name: string;
  coverageType: string;
  monthlyPremium: number;
  coverageAmount: number;
  active: boolean;
  nextPaymentDate: string;
}

// ─── Seed data (replaces hardcoded JSX — removed once contract read is wired) ─

const SEED_POLICIES: Policy[] = [
  {
    id: "policy-seed-1",
    name: "Health Insurance",
    coverageType: "health",
    monthlyPremium: 20,
    coverageAmount: 1000,
    active: true,
    nextPaymentDate: new Date(Date.now() + 12 * 86_400_000).toISOString().slice(0, 10),
  },
  {
    id: "policy-seed-2",
    name: "Emergency Coverage",
    coverageType: "emergency",
    monthlyPremium: 15,
    coverageAmount: 500,
    active: true,
    nextPaymentDate: new Date(Date.now() - 1 * 86_400_000).toISOString().slice(0, 10),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Insurance() {
  const { t } = useClientTranslator();

  /** Controls whether the New Policy form is expanded */
  const [showForm, setShowForm] = useState(false);

  /** Active policies list — seeded with mock data, grows on success */
  const [policies, setPolicies] = useState<Policy[]>(SEED_POLICIES);

  const formSectionRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useFormAction<AddInsuranceResponse>(
    "/api/insurance"
  );

  /** Optimistically add newly created policy to the list */
  useEffect(() => {
    if (
      state?.success &&
      state.policyName &&
      state.coverageType &&
      state.monthlyPremium !== undefined &&
      state.coverageAmount !== undefined
    ) {
      const newPolicy: Policy = {
        id: `policy-opt-${Date.now()}`,
        name: state.policyName,
        coverageType: state.coverageType,
        monthlyPremium: state.monthlyPremium,
        coverageAmount: state.coverageAmount,
        active: true,
        nextPaymentDate: new Date(Date.now() + 30 * 86_400_000)
          .toISOString()
          .slice(0, 10),
      };
      // Prepend so it appears first
      setPolicies((prev) => {
        // Guard against duplicate on StrictMode double-effect
        if (prev.some((p) => p.id === newPolicy.id)) return prev;
        return [newPolicy, ...prev];
      });
      // Collapse the form after success
      setShowForm(false);
    }
  }, [state?.success, state?.policyName]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleNewPolicyClick() {
    setShowForm((prev) => !prev);
    // Scroll and focus after paint
    if (!showForm) {
      requestAnimationFrame(() => {
        formSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        firstFieldRef.current?.focus();
      });
    }
  }

  const totalPremium = policies.reduce((sum, p) => sum + p.monthlyPremium, 0);

  return (
    <div className="min-h-screen bg-[#010101]">
      <PageHeader
        title={t("insurance.page_title")}
        subtitle={t("insurance.page_subtitle")}
        ctaLabel={
          showForm ? t("insurance.new_policy") : t("insurance.new_policy")
        }
        onCtaClick={handleNewPolicyClick}
        showBottomDivider
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 space-y-8">
        {/* ── Active Policies ── */}
        <section aria-labelledby="active-policies-heading">
          <h2
            id="active-policies-heading"
            className="mb-4 text-xl font-bold text-white"
          >
            {t("insurance.active_policies")}
          </h2>

          {policies.length === 0 ? (
            <EmptyPolicies
              title={t("insurance.no_policies_title")}
              body={t("insurance.no_policies_body")}
              onCta={handleNewPolicyClick}
              ctaLabel={t("insurance.new_policy")}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {policies.map((policy) => (
                <PolicyCard key={policy.id} policy={policy} t={t} />
              ))}
            </div>
          )}
        </section>

        {/* ── Total Premium ── */}
        {policies.length > 0 && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#111] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {t("insurance.total_premium")}
                </h3>
                <p className="mt-0.5 text-sm text-gray-400">
                  {t("insurance.total_premium_sub")}
                </p>
              </div>
              <div
                className="text-3xl font-bold text-red-400"
                aria-label={`$${totalPremium} per month`}
              >
                ${totalPremium}
              </div>
            </div>
          </div>
        )}

        {/* ── New Policy Form (toggled) ── */}
        <div ref={formSectionRef}>
          {/* Toggle bar */}
          <button
            type="button"
            aria-expanded={showForm}
            aria-controls="new-policy-form-region"
            onClick={handleNewPolicyClick}
            className="flex w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-[#111] px-6 py-4 text-left transition hover:bg-[#181818] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/20 text-red-400">
                <Plus className="h-4 w-4" />
              </div>
              <span className="font-semibold text-white">
                {t("insurance.form_title")}
              </span>
            </div>
            <ChevronUp
              className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                showForm ? "rotate-0" : "rotate-180"
              }`}
              aria-hidden
            />
          </button>

          {/* Collapsible form region */}
          <div
            id="new-policy-form-region"
            role="region"
            aria-label={t("insurance.form_title")}
            className={`overflow-hidden transition-all duration-300 ${
              showForm ? "mt-4 max-h-[9999px] opacity-100" : "max-h-0 opacity-0"
            }`}
            // Respect reduced-motion preference
            style={
              typeof window !== "undefined" &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? { transition: "none" }
                : undefined
            }
          >
            <NewPolicyForm
              state={state}
              formAction={formAction}
              pending={pending}
              firstFieldRef={firstFieldRef}
              t={t}
            />
          </div>
function PolicyCard({ name, coverageType, monthlyPremium, coverageAmount, nextPayment, active }: { 
  name: string, 
  coverageType: string, 
  monthlyPremium: number, 
  coverageAmount: number, 
  nextPayment: string,
  active: boolean 
}) {
  const paymentStatus = getPolicyPaymentPresentation(nextPayment, active);
  const StatusIcon = paymentStatus.icon;

        {/* ── Integration note ── */}
        <div
          role="note"
          className="flex gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.06] px-4 py-3"
        >
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" aria-hidden />
          <p className="text-sm text-yellow-200">{t("insurance.integration_note")}</p>
        </div>
      </main>
    </div>
  );
}

// ─── NewPolicyForm ─────────────────────────────────────────────────────────────

interface NewPolicyFormProps {
  state: AddInsuranceResponse;
  formAction: (fd: FormData) => void;
  pending: boolean;
  firstFieldRef: React.RefObject<HTMLInputElement>;
  t: (key: string) => string;
}

/**
 * Inline policy creation form.
 *
 * - Zod validation errors surface at field level (via `state.validationErrors`).
 * - Success renders a structured confirmation badge.
 * - `AsyncSubmissionStatus` owns all state transitions (idle / pending / success / error).
 * - First field gets focus automatically when the form is opened.
 */
function NewPolicyForm({
  state,
  formAction,
  pending,
  firstFieldRef,
  t,
}: NewPolicyFormProps) {
  const policyNameId = useId();
  const coverageTypeId = useId();
  const monthlyPremiumId = useId();
  const coverageAmountId = useId();

  const policyNameErrId = `${policyNameId}-err`;
  const coverageTypeErrId = `${coverageTypeId}-err`;
  const monthlyPremiumErrId = `${monthlyPremiumId}-err`;
  const coverageAmountErrId = `${coverageAmountId}-err`;

  function fieldError(path: string) {
    return state?.validationErrors?.find((e) => e.path === path)?.message;
  }

  const policyNameErr = fieldError("policyName");
  const coverageTypeErr = fieldError("coverageType");
  const monthlyPremiumErr = fieldError("monthlyPremium");
  const coverageAmountErr = fieldError("coverageAmount");

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] p-6 sm:p-8">
      {/* Form header */}
      <div className="border-b border-white/[0.08] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300">
          {t("insurance.form_eyebrow")}
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          {t("insurance.form_title")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-300">
          {t("insurance.form_description")}
        </p>
      </div>

      {/* Success confirmation — rendered instead of the form inputs once done */}
      {state?.success && state.policyName ? (
        <PolicySuccessCard state={state} t={t} />
      ) : (
        <form
          className="mt-6 space-y-6"
          action={formAction}
          aria-label={t("insurance.form_title")}
          noValidate
        >
          {/* Policy Name */}
          <div className="grid gap-1.5">
            <label
              htmlFor={policyNameId}
              className="block text-sm font-medium text-gray-300"
            >
              {t("insurance.field_policy_name")}
            </label>
            <input
              ref={firstFieldRef}
              id={policyNameId}
              type="text"
              name="policyName"
              defaultValue={state?.policyName ?? ""}
              placeholder={t("insurance.field_policy_name_placeholder")}
              autoComplete="off"
              aria-invalid={!!policyNameErr}
              aria-describedby={policyNameErr ? policyNameErrId : undefined}
              className={`w-full rounded-xl border px-4 py-3 text-white placeholder-gray-500 transition focus:outline-none focus:ring-2 focus:ring-red-500 ${
                policyNameErr
                  ? "border-red-500/60 bg-red-500/[0.06]"
                  : "border-white/10 bg-[#1a1a1a]"
              }`}
            />
            {policyNameErr && (
              <p id={policyNameErrId} role="alert" className="text-sm text-red-400">
                {policyNameErr}
              </p>
            )}
          </div>

          {/* Coverage Type */}
          <div className="grid gap-1.5">
            <label
              htmlFor={coverageTypeId}
              className="block text-sm font-medium text-gray-300"
            >
              {t("insurance.field_coverage_type")}
            </label>
            <select
              id={coverageTypeId}
              name="coverageType"
              defaultValue={state?.coverageType ?? ""}
              aria-invalid={!!coverageTypeErr}
              aria-describedby={coverageTypeErr ? coverageTypeErrId : undefined}
              className={`w-full rounded-xl border px-4 py-3 text-white transition focus:outline-none focus:ring-2 focus:ring-red-500 ${
                coverageTypeErr
                  ? "border-red-500/60 bg-red-500/[0.06]"
                  : "border-white/10 bg-[#1a1a1a]"
              }`}
            >
              <option value="" disabled className="text-gray-500">
                {t("insurance.field_coverage_type_placeholder")}
              </option>
              <option value="Health">{t("insurance.coverage_health")}</option>
              <option value="Emergency">{t("insurance.coverage_emergency")}</option>
              <option value="Life">{t("insurance.coverage_life")}</option>
            </select>
            {coverageTypeErr && (
              <p id={coverageTypeErrId} role="alert" className="text-sm text-red-400">
                {coverageTypeErr}
              </p>
            )}
          </div>

          {/* Monthly Premium + Coverage Amount */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Monthly Premium */}
            <div className="grid gap-1.5">
              <label
                htmlFor={monthlyPremiumId}
                className="block text-sm font-medium text-gray-300"
              >
                {t("insurance.field_monthly_premium")}
              </label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-4 top-3 text-gray-500"
                  aria-hidden
                >
                  $
                </span>
                <input
                  id={monthlyPremiumId}
                  type="number"
                  name="monthlyPremium"
                  defaultValue={state?.monthlyPremium ?? ""}
                  placeholder={t("insurance.field_monthly_premium_placeholder")}
                  step="0.01"
                  min="0.01"
                  aria-invalid={!!monthlyPremiumErr}
                  aria-describedby={
                    monthlyPremiumErr ? monthlyPremiumErrId : undefined
                  }
                  className={`w-full rounded-xl border py-3 pl-8 pr-4 text-white placeholder-gray-500 transition focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    monthlyPremiumErr
                      ? "border-red-500/60 bg-red-500/[0.06]"
                      : "border-white/10 bg-[#1a1a1a]"
                  }`}
                />
              </div>
              {monthlyPremiumErr && (
                <p
                  id={monthlyPremiumErrId}
                  role="alert"
                  className="text-sm text-red-400"
                >
                  {monthlyPremiumErr}
                </p>
              )}
            </div>

            {/* Coverage Amount */}
            <div className="grid gap-1.5">
              <label
                htmlFor={coverageAmountId}
                className="block text-sm font-medium text-gray-300"
              >
                {t("insurance.field_coverage_amount")}
              </label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-4 top-3 text-gray-500"
                  aria-hidden
                >
                  $
                </span>
                <input
                  id={coverageAmountId}
                  type="number"
                  name="coverageAmount"
                  defaultValue={state?.coverageAmount ?? ""}
                  placeholder={t("insurance.field_coverage_amount_placeholder")}
                  step="0.01"
                  min="0.01"
                  aria-invalid={!!coverageAmountErr}
                  aria-describedby={
                    coverageAmountErr ? coverageAmountErrId : undefined
                  }
                  className={`w-full rounded-xl border py-3 pl-8 pr-4 text-white placeholder-gray-500 transition focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    coverageAmountErr
                      ? "border-red-500/60 bg-red-500/[0.06]"
                      : "border-white/10 bg-[#1a1a1a]"
                  }`}
                />
              </div>
              {coverageAmountErr && (
                <p
                  id={coverageAmountErrId}
                  role="alert"
                  className="text-sm text-red-400"
                >
                  {coverageAmountErr}
                </p>
              )}
            </div>
          </div>

          {/* Async status panel */}
          <AsyncSubmissionStatus
            pending={pending}
            error={state?.error}
            success={state?.success}
            idleTitle={t("insurance.status_idle_title")}
            idleDescription={t("insurance.status_idle_desc")}
            pendingTitle={t("insurance.status_pending_title")}
            pendingDescription={t("insurance.status_pending_desc")}
            successTitle={t("insurance.status_success_title")}
            successDescription={state?.success}
            errorTitle={t("insurance.status_error_title")}
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                <span>{t("insurance.submitting")}</span>
              </>
            ) : (
              t("insurance.submit")
            )}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── PolicySuccessCard ─────────────────────────────────────────────────────────

/**
 * Rendered inside the form area once `state.success` is truthy.
 * Displays the typed response fields returned by POST /api/insurance.
 */
function PolicySuccessCard({
  state,
  t,
}: {
  state: AddInsuranceResponse;
  t: (key: string) => string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <ShieldCheck className="h-6 w-6 text-emerald-400" aria-hidden />
        <h3 className="font-semibold text-white">{t("insurance.status_success_title")}</h3>
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SuccessBadge label={t("insurance.success_badge_name")} value={state.policyName} />
        <SuccessBadge label={t("insurance.success_badge_type")} value={state.coverageType} />
        <SuccessBadge
          label={t("insurance.success_badge_premium")}
          value={state.monthlyPremium !== undefined ? `$${state.monthlyPremium}/mo` : undefined}
        />
        <SuccessBadge
          label={t("insurance.success_badge_coverage")}
          value={state.coverageAmount !== undefined ? `$${state.coverageAmount}` : undefined}
        />
      </dl>
    </div>
  );
}

function SuccessBadge({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) {
  if (value === undefined || value === null) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 font-semibold text-white">{value}</dd>
    </div>
  );
}

// ─── PolicyCard ────────────────────────────────────────────────────────────────

function PolicyCard({
  policy,
  t,
}: {
  policy: Policy;
  t: (key: string) => string;
}) {
  const paymentStatus = getPolicyPaymentPresentation(
    policy.nextPaymentDate,
    policy.active
  );
  const StatusIcon = paymentStatus.icon;

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#111] p-6">
      {/* Card header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-400" aria-hidden />
          <h3 className="text-lg font-semibold text-white">{policy.name}</h3>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentStatus.badgeClassName}`}
        >
          <StatusIcon className="h-3.5 w-3.5" aria-hidden />
          <span>{paymentStatus.label}</span>
        </span>
      </div>

      {/* Policy details */}
      <dl className="space-y-3">
        <PolicyRow
          label={t("insurance.card_coverage_type")}
          value={<span className="capitalize">{policy.coverageType}</span>}
        />
        <PolicyRow
          label={t("insurance.card_monthly_premium")}
          value={`$${policy.monthlyPremium}`}
        />
        <PolicyRow
          label={t("insurance.card_coverage_amount")}
          value={`$${policy.coverageAmount}`}
        />
        <PolicyRow
          label={t("insurance.card_next_payment")}
          value={policy.nextPaymentDate}
        />
      </dl>

      {/* Status panel */}
      <div
        className={`mt-4 rounded-xl border px-3 py-3 ${paymentStatus.panelClassName}`}
      >
        <div className="flex items-start gap-2">
          <StatusIcon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{paymentStatus.label}</p>
            <p className="text-sm">{paymentStatus.emphasis}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              <span>
                {t("insurance.card_next_payment")}: {policy.nextPaymentDate}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Pay now — kept disabled per current scope; wired payment flow is a separate task */}
      {policy.active && (
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="mt-4 w-full cursor-not-allowed rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-2 text-sm font-semibold text-gray-500 transition"
        >
          {t("insurance.card_pay_now")}
        </button>
      )}
    </article>
  );
}

function PolicyRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-gray-400">{label}</dt>
      <dd className="font-semibold text-white">{value}</dd>
    </div>
  );
}

// ─── EmptyPolicies ─────────────────────────────────────────────────────────────

function EmptyPolicies({
  title,
  body,
  onCta,
  ctaLabel,
}: {
  title: string;
  body: string;
  onCta: () => void;
  ctaLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] py-16 text-center">
      <Shield className="mb-4 h-10 w-10 text-gray-600" aria-hidden />
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-gray-400">{body}</p>
      <button
        type="button"
        onClick={onCta}
        className="mt-6 flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 font-medium text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101]"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {ctaLabel}
      </button>
    </div>
  );
}
