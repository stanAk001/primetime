-- The complex now runs 8am–10pm. Previously it spanned 6am (the pitch and
-- the gym) to 2am (the lounge's last call), so both ends move.
--
-- The hotel is deliberately left at 00:00–23:59: guests sleep there, and
-- showing "closes at 10pm" on a room would be wrong.
UPDATE facilities
SET opening_time = '08:00:00',
    closing_time = '22:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE slug IN ('gym', 'bar-lounge', 'football-ground', 'table-tennis');

-- The lounge's copy promised live acts "through the night", which no longer
-- matches a 10pm close.
UPDATE facilities
SET long_description = 'Wine, spirits and fresh juice at the bar, grilled beef and cow leg pepper soup off the fire, and a stage where live acts play through the evening.',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'bar-lounge';
