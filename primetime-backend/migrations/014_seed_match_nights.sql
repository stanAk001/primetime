-- Packages priced for Ibadan and built from the grill menu that already
-- exists, so the kitchen isn't being asked to invent anything new.
INSERT INTO match_packages (name, tagline, price, serves, includes, display_order)
VALUES
  ('The Terrace', 'A table, the game, and enough suya to argue over', 25000, 4,
   '["Reserved table", "Beef suya platter", "4 bottles of your choice", "Full view of the main screen"]'::jsonb, 1),
  ('Front Row', 'Closest seats in the house', 45000, 6,
   '["Best tables in the room", "Asun & peppered chicken", "6 bottles or a bottle of spirits", "Half-time small chops"]'::jsonb, 2),
  ('The Box', 'Your own corner for the whole night', 90000, 10,
   '["Private section for 10", "Full grill spread", "Bottle service", "Reserved parking", "Stays yours after full time"]'::jsonb, 3);

-- Seeded relative to today so the calendar is never stale in a demo.
INSERT INTO fixtures (competition, home_team, away_team, kickoff_at, is_featured, undercard_at, media_key, note)
VALUES
  ('Premier League', 'Arsenal', 'Manchester United',
   (CURRENT_DATE + 2) + TIME '17:30', true,
   (CURRENT_DATE + 2) + TIME '15:00', 'match-featured',
   'Main wall. Five-a-side on our pitch before kickoff.'),
  ('Premier League', 'Liverpool', 'Manchester City',
   (CURRENT_DATE + 4) + TIME '20:00', true,
   NULL, 'match-featured', 'Main wall.'),
  ('UEFA Champions League', 'Real Madrid', 'Bayern Munich',
   (CURRENT_DATE + 6) + TIME '21:00', false,
   NULL, 'match-side', NULL),
  ('Nigeria Premier Football League', 'Shooting Stars', 'Rangers',
   (CURRENT_DATE + 8) + TIME '16:00', true,
   (CURRENT_DATE + 8) + TIME '13:30', 'match-featured',
   'Ibadan derby. Book early — this one fills.');
