-- Registration fee corrected: it's a one-time gate per member, not a
-- property of any one plan. Whichever plan someone buys first bundles
-- the ₦5,000 in; every plan they buy after that for the same facility
-- is plan price only. Tracked per membership row instead of per plan.

ALTER TABLE memberships ADD COLUMN registration_fee_paid BOOLEAN DEFAULT false;

-- Backfill: under the old (incorrect) model only the Monthly plan
-- carried the fee, so any Monthly membership that was actually
-- activated already paid it.
UPDATE memberships m
SET registration_fee_paid = true
FROM membership_plans p
WHERE m.plan_id = p.id AND p.name = 'Monthly' AND m.starts_at IS NOT NULL;

ALTER TABLE membership_plans DROP COLUMN requires_registration_fee;

-- Reprice: Day Pass confirmed at ₦2,000 (was ₦3,000); Monthly confirmed
-- unchanged at ₦25,000. Weekly/2-week/3-week are re-anchored estimates
-- off the new daily rate — still placeholders pending final numbers,
-- editable any time from the admin Membership Plans tab.
UPDATE membership_plans SET price = 2000.00 WHERE name = 'Day Pass';
UPDATE membership_plans SET price = 12000.00 WHERE name = 'Weekly';
UPDATE membership_plans SET price = 21000.00 WHERE name = '2 Weeks';
UPDATE membership_plans SET price = 28000.00 WHERE name = '3 Weeks';
