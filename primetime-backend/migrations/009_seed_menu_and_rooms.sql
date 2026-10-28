-- Menu modelled on what an upmarket Nigerian lounge actually pours and grills
-- (Star/Gulder/Trophy on the beer list, Chapman and zobo alongside the
-- cocktails, suya and nkwobi off the fire). Pricing is pitched for Ibadan —
-- comfortably above a roadside bar, well under Victoria Island lounge rates.

INSERT INTO menu_categories (facility_id, name, slug, tagline, media_key, display_order)
SELECT f.id, c.name, c.slug, c.tagline, c.media_key, c.display_order
FROM facilities f
CROSS JOIN (VALUES
  ('Beer & Stout',        'beer',      'Cold, and kept that way',              'beer',      1),
  ('Cocktails & Chapman', 'cocktails', 'Chapman the way Ibadan drinks it',     'cocktails', 2),
  ('Spirits & Cognac',    'spirits',   'By the bottle, with mixers on the house', 'spirits',3),
  ('Wine & Champagne',    'wine',      'For the table that''s celebrating',    'wine',      4),
  ('Fresh Juice & Zobo',  'juice',     'Pressed the same day',                 'juice',     5),
  ('From the Grill',      'grill',     'Off the fire, straight to you',        'grill',     6)
) AS c(name, slug, tagline, media_key, display_order)
WHERE f.slug = 'bar-lounge';

INSERT INTO menu_items (category_id, name, description, price, serving, media_key, tags, display_order)
SELECT mc.id, i.name, i.description, i.price, i.serving, i.media_key, i.tags::jsonb, i.display_order
FROM menu_categories mc
JOIN facilities f ON f.id = mc.facility_id AND f.slug = 'bar-lounge'
JOIN (VALUES
  -- Beer & stout
  ('beer', 'Star Lager',        'The one everybody starts the night with.',                      2500, '60cl bottle', 'beer-star',    '["Alcoholic"]', 1),
  ('beer', 'Gulder',            'Fuller and a little more bitter than Star.',                    2800, '60cl bottle', 'beer-gulder',  '["Alcoholic"]', 2),
  ('beer', 'Trophy',            'The South-West''s own — light and easy.',                       2200, '60cl bottle', 'beer-trophy',  '["Alcoholic","Local favourite"]', 3),
  ('beer', 'Heineken',          'Served properly cold, never on the counter.',                   3500, '60cl bottle', 'beer-heineken','["Alcoholic","Import"]', 4),
  ('beer', 'Guinness Foreign Extra', 'Thick, roasted and unmistakable.',                         3000, '60cl bottle', 'beer-guinness','["Alcoholic"]', 5),
  ('beer', 'Legend Extra Stout','Smoother than Guinness, same weight.',                          3000, '60cl bottle', 'beer-legend',  '["Alcoholic"]', 6),
  ('beer', '"33" Export',       'Crisp lager, easy through a long evening.',                      2500, '60cl bottle', 'beer-33',      '["Alcoholic"]', 7),

  -- Cocktails & Chapman
  ('cocktails', 'Chapman',        'Fanta, Sprite, grenadine, cucumber and a dash of bitters.',   3500, 'tall glass',  'cocktail-chapman', '["Signature","Non-alcoholic"]', 1),
  ('cocktails', 'Zobo Spritz',    'Chilled hibiscus, ginger and citrus, lengthened with soda.',  3000, 'tall glass',  'cocktail-zobo',    '["Signature","Non-alcoholic"]', 2),
  ('cocktails', 'Palm Wine Punch','Fresh palm wine, lime and a little honey, over ice.',         4000, 'calabash',    'cocktail-palm',    '["Alcoholic","Local favourite"]', 3),
  ('cocktails', 'Mojito',         'White rum, lime and mint, built tall.',                       6500, 'tall glass',  'cocktail-mojito',  '["Alcoholic"]', 4),
  ('cocktails', 'Piña Colada',    'Rum, pineapple and coconut cream.',                           6500, 'tall glass',  'cocktail-colada',  '["Alcoholic"]', 5),

  -- Spirits & cognac (bottle service)
  ('spirits', 'Hennessy VSOP',        'Bottle service, mixers and ice included.',             180000, '70cl bottle', 'spirit-hennessy', '["Alcoholic","Bottle service"]', 1),
  ('spirits', 'Johnnie Walker Black', 'Twelve years, and it shows.',                           95000, '75cl bottle', 'spirit-jw',       '["Alcoholic","Bottle service"]', 2),
  ('spirits', 'Jack Daniel''s',       'Tennessee whiskey, sweet and smoky.',                   85000, '70cl bottle', 'spirit-jack',     '["Alcoholic","Bottle service"]', 3),
  ('spirits', 'Jameson',              'Triple distilled, easy with ginger ale.',               75000, '70cl bottle', 'spirit-jameson',  '["Alcoholic","Bottle service"]', 4),
  ('spirits', 'Smirnoff Vodka',       'The house pour for anything mixed.',                    35000, '75cl bottle', 'spirit-smirnoff', '["Alcoholic","Bottle service"]', 5),
  ('spirits', 'Campari',              'Bitter, red, and better with orange.',                  28000, '75cl bottle', 'spirit-campari',  '["Alcoholic"]', 6),
  ('spirits', 'Alomo Bitters',        'Herbal, warming, taken in shots.',                       6000, '20cl bottle', 'spirit-alomo',    '["Alcoholic","Local favourite"]', 7),

  -- Wine & champagne
  ('wine', 'Moët & Chandon Brut',  'For when the table has something to mark.',                210000, '75cl bottle', 'wine-moet',   '["Alcoholic","Bottle service"]', 1),
  ('wine', 'Carlo Rossi Sweet Red','The sweet red everyone actually orders.',                   22000, '75cl bottle', 'wine-rossi',  '["Alcoholic"]', 2),
  ('wine', 'Four Cousins',         'Soft, sweet and hard to argue with.',                       18000, '75cl bottle', 'wine-four',   '["Alcoholic"]', 3),
  ('wine', 'Nederburg Cabernet',   'Dry red, good against the grill.',                          26000, '75cl bottle', 'wine-neder',  '["Alcoholic"]', 4),

  -- Fresh juice & zobo
  ('juice', 'Fresh Orange',        'Pressed the same morning, nothing added.',                   3000, 'tall glass',  'juice-orange',    '["Non-alcoholic"]', 1),
  ('juice', 'Pineapple & Ginger',  'Sharp, cold and good for the heat.',                         3500, 'tall glass',  'juice-pineapple', '["Non-alcoholic"]', 2),
  ('juice', 'Chilled Zobo',        'Hibiscus steeped with cloves and pineapple.',                2500, 'tall glass',  'juice-zobo',      '["Non-alcoholic","Local favourite"]', 3),
  ('juice', 'Watermelon Cooler',   'Blended watermelon, mint and lime.',                         3000, 'tall glass',  'juice-watermelon','["Non-alcoholic"]', 4),

  -- From the grill
  ('grill', 'Beef Suya',           'Skewered, spiced with yaji, onions and tomato on the side.',  6000, 'per plate',  'grill-suya',    '["Chef''s pick"]', 1),
  ('grill', 'Asun',                'Goat meat, roasted then fired with scotch bonnet.',           8000, 'per plate',  'grill-asun',    '["Chef''s pick","Hot"]', 2),
  ('grill', 'Cow Leg Pepper Soup', 'Slow-cooked till it gives, in a hot peppery broth.',          9000, 'bowl',       'grill-peppersoup','["House speciality"]', 3),
  ('grill', 'Nkwobi',              'Cow foot in spiced palm oil sauce, served warm.',            10000, 'bowl',       'grill-nkwobi',  '["House speciality"]', 4),
  ('grill', 'Isi Ewu',             'Goat head in palm oil sauce — order it with a cold stout.',  12000, 'bowl',       'grill-isiewu',  '["House speciality"]', 5),
  ('grill', 'Peppered Snail',      'Large snails, seared with peppers and onion.',               12000, 'per plate',  'grill-snail',   '["Chef''s pick"]', 6),
  ('grill', 'Grilled Catfish',     'Whole catfish off the fire with pepper sauce.',              11000, 'whole fish', 'grill-catfish', '[]', 7),
  ('grill', 'Peppered Chicken',    'Quartered, grilled and tossed in pepper sauce.',              7000, 'per plate',  'grill-chicken', '[]', 8),
  ('grill', 'Small Chops Platter', 'Puff puff, spring rolls, samosa and gizzard to share.',       7500, 'sharing platter','grill-smallchops','["To share"]', 9)
) AS i(cat_slug, name, description, price, serving, media_key, tags, display_order)
  ON i.cat_slug = mc.slug;

-- Hotel room types. "The hotel" was one price and one photo; it is really
-- three products at three very different rates.
INSERT INTO rooms (facility_id, name, slug, tier, description, price_per_night, capacity, bed, size_sqm, amenities, media_key, display_order)
SELECT f.id, r.name, r.slug, r.tier, r.description, r.price, r.capacity, r.bed, r.size_sqm, r.amenities::jsonb, r.media_key, r.display_order
FROM facilities f
CROSS JOIN (VALUES
  ('Garden Room',   'garden-room',   'basic',
   'A quiet room on the ground floor opening onto the garden. Everything you need for a night, nothing you won''t use.',
   35000, 2, 'Queen bed', 22,
   '["Air conditioning", "En-suite bathroom", "Free Wi-Fi", "Smart TV", "Garden access"]', 'room-basic', 1),
  ('Executive Room','executive-room','standard',
   'More room to spread out, a desk that works for actual work, and a view over the complex rather than the car park.',
   55000, 3, 'King bed', 30,
   '["Air conditioning", "Work desk", "Free Wi-Fi", "Smart TV", "Mini fridge", "Breakfast included"]', 'room-standard', 2),
  ('Prime Suite',   'prime-suite',   'luxury',
   'A separate living room, a wide balcony over the grounds, and a soaking tub. The one we put people in when it matters.',
   120000, 4, 'King suite', 55,
   '["Separate living room", "Private balcony", "Soaking tub", "Air conditioning", "Free Wi-Fi", "Smart TV", "Mini bar", "Breakfast included", "Late checkout"]', 'room-luxury', 3)
) AS r(name, slug, tier, description, price, capacity, bed, size_sqm, amenities, media_key, display_order)
WHERE f.slug = 'hotel';
