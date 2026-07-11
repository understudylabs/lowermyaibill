const MONTHLY_SPEND_PER_ROUTE_USD = 1_000;
const MAX_SAVINGS_RATE = 0.5;

const opportunityRates = new Map([
  ["prompt-cache", 0.15],
  ["model-rightsizing", 0.20],
  ["output-controls", 0.05],
  ["stable-prefix", 0.05],
  ["retry-amplification", 0.05],
  ["batch", 0.15],
]);

export function estimateOpportunity(scan) {
  const routes = scan.routes?.length ?? 0;
  const weighted = (scan.opportunities ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    base_rate: opportunityRates.get(item.id) ?? 0,
  }));
  const uncappedRate = weighted.reduce((total, item) => total + item.base_rate, 0);
  const savingsRate = Math.min(uncappedRate, MAX_SAVINGS_RATE);
  const annualBaselineUsd = routes * MONTHLY_SPEND_PER_ROUTE_USD * 12;
  const annualSavingsUsd = Math.round((annualBaselineUsd * savingsRate) / 100) * 100;
  const scale = uncappedRate > 0 ? savingsRate / uncappedRate : 0;
  const breakdown = weighted.map((item) => ({
    ...item,
    applied_rate: item.base_rate * scale,
    annual_savings_usd: Math.round((annualBaselineUsd * item.base_rate * scale) / 100) * 100,
  }));
  const roundedTotal = breakdown.reduce((total, item) => total + item.annual_savings_usd, 0);
  const adjustmentTarget = breakdown.find((item) => item.annual_savings_usd > 0);
  if (adjustmentTarget) adjustmentTarget.annual_savings_usd += annualSavingsUsd - roundedTotal;
  return {
    annual_savings_usd: annualSavingsUsd,
    annual_baseline_usd: annualBaselineUsd,
    breakdown,
    monthly_spend_per_route_usd: MONTHLY_SPEND_PER_ROUTE_USD,
    max_savings_rate: MAX_SAVINGS_RATE,
    raw_savings_rate: uncappedRate,
    savings_rate: savingsRate,
    routes,
  };
}

export function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
