/**
 * Sanitization layer for appointment payloads
 * Ensures only recurring_rule_id reaches the database (never rule_id)
 */

export type AppointmentPayload = Record<string, any>;

/**
 * Sanitizes appointment creation payload
 * - Merges rule_id into recurring_rule_id if present
 * - Removes rule_id from final payload
 */
export function sanitizeAppointmentCreate(
  input: AppointmentPayload
): AppointmentPayload {
  // Prioritize rule_id over recurring_rule_id if both exist (backward compatibility)
  const recurring_rule_id = input.rule_id ?? input.recurring_rule_id ?? null;

  // Remove rule_id before persisting
  const { rule_id: _drop, ...rest } = input;
  
  return {
    ...rest,
    recurring_rule_id, // único campo que chega ao DB
  };
}

/**
 * Sanitizes appointment update payload
 * - Merges rule_id into recurring_rule_id if present
 * - Removes rule_id from final payload
 */
export function sanitizeAppointmentUpdate(
  input: AppointmentPayload
): AppointmentPayload {
  // Prioritize rule_id over recurring_rule_id if both exist (backward compatibility)
  const recurring_rule_id = input.rule_id ?? input.recurring_rule_id ?? null;

  // Remove rule_id before persisting
  const { rule_id: _drop, ...rest } = input;
  
  return {
    ...rest,
    recurring_rule_id,
  };
}
