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
  const uncappedRate = (scan.opportunities ?? []).reduce((total, item) => (
    total + (opportunityRates.get(item.id) ?? 0)
  ), 0);
  const savingsRate = Math.min(uncappedRate, MAX_SAVINGS_RATE);
  const annualBaselineUsd = routes * MONTHLY_SPEND_PER_ROUTE_USD * 12;
  const annualSavingsUsd = Math.round((annualBaselineUsd * savingsRate) / 100) * 100;
  return {
    annual_savings_usd: annualSavingsUsd,
    annual_baseline_usd: annualBaselineUsd,
    monthly_spend_per_route_usd: MONTHLY_SPEND_PER_ROUTE_USD,
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
