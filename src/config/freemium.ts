// Global freemium configuration
// Set to true to disable all subscription checks and enable full freemium access
export const FREEMIUM_MODE = true;

// When FREEMIUM_MODE is true:
// - All authenticated users get full access
// - No subscription checks are performed
// - Billing-related UI is hidden
// - Payment flows are disabled
// - All users are treated as having active subscriptions

export const getFreemiumConfig = () => ({
  freemium_mode: FREEMIUM_MODE,
  billing_calls_disabled: FREEMIUM_MODE,
  assinar_redirects_to_dashboard: FREEMIUM_MODE,
  paywall_overlay_disabled: FREEMIUM_MODE,
  subscription_checks_bypassed: FREEMIUM_MODE,
});