-- ====================================================================
-- Seed Deori Taluka Administrative Areas
-- Ensures foreign keys referencing taluka_areas(id) resolve cleanly.
-- ====================================================================

INSERT IGNORE INTO taluka_areas (id, name, marathi_name, taluka, district, is_headquarters, is_active, sort_order) VALUES
  ('deori-hq', 'Deori Town (HQ)', 'देवरी शहर (मुख्यालय)', 'Deori', 'Gondia', TRUE, TRUE, 1),
  ('chichgarh', 'Chichgarh', 'चिचगड', 'Deori', 'Gondia', FALSE, TRUE, 2),
  ('soundad', 'Soundad', 'सौंदड', 'Deori', 'Gondia', FALSE, TRUE, 3),
  ('borgaon', 'Borgaon', 'बोरगाव', 'Deori', 'Gondia', FALSE, TRUE, 4),
  ('salekasa-border', 'Salekasa Border Belt', 'सालेकसा सीमा क्षेत्र', 'Deori', 'Gondia', FALSE, TRUE, 5),
  ('shiwnikalan', 'Shiwnikalan', 'शिवणीकलां', 'Deori', 'Gondia', FALSE, TRUE, 6),
  ('mando-devi', 'Mando Devi Temple Precinct', 'मांडो देवी परिसर', 'Deori', 'Gondia', FALSE, TRUE, 7),
  ('kohmara', 'Kohmara Junction', 'कोहमारा जंक्शन', 'Deori', 'Gondia', FALSE, TRUE, 8);
