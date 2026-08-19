/**
 * Shared Tailwind utility strings for the three report views. Presentational
 * only — keeps `bg-surface`/`border-surfaceBorder`/etc. token usage
 * consistent instead of repeating class strings across business, invoices,
 * and operations views.
 */
export const reportSectionClass = "flex flex-col gap-6";
export const reportHeadingClass = "text-2xl font-semibold text-onSurface";
export const subHeadingClass = "text-lg font-semibold text-onSurface";
export const stateMutedClass = "text-sm text-onSurfaceMuted";
export const stateErrorClass = "text-sm font-medium text-error";
export const cardClass = "rounded-2xl border border-surfaceBorder bg-surface p-5";
export const statValueClass = "text-3xl font-semibold text-onSurface";
export const statLabelClass = "text-sm text-onSurfaceMuted";
export const listCardClass = "flex flex-col divide-y divide-surfaceBorder rounded-2xl border border-surfaceBorder bg-surface";
export const listRowClass = "px-5 py-3 text-sm text-onSurface";
export const footnoteClass = "text-xs text-onSurfaceMuted";
