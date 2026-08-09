// coachRevenue.js - Derive a coach's CoachMarket earnings from their listings.
// Single source of truth for the revenue math shown across coach screens
// (CoachHome stat, CoachMarket dashboard). Earnings are lifetime price×sales —
// there's no per-sale timestamp ledger, so this is a lifetime total, not "this
// month". The real-time bankable number lives on the Payouts card (Stripe balance).

/**
 * @param {Array} listings - from getCoachListings(coachUid)
 * @returns {{ totalEarnings: number, totalSales: number, avgRating: number }}
 */
export const computeCoachRevenue = (listings = []) => {
  const totalEarnings = listings.reduce((sum, l) => sum + (l.price || 0) * (l.sales || 0), 0);
  const totalSales = listings.reduce((sum, l) => sum + (l.sales || 0), 0);
  const rated = listings.filter((l) => l.rating != null);
  const avgRating = rated.length
    ? rated.reduce((sum, l) => sum + l.rating, 0) / rated.length
    : 0;
  return { totalEarnings, totalSales, avgRating };
};
