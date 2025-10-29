-- ============================================
-- DYNAMIC POPUP CONFIGURATION SYSTEM
-- Allows configuring what appears in village popups
-- ============================================

-- Create popup_config table
CREATE TABLE IF NOT EXISTS popup_config (
  location_id VARCHAR PRIMARY KEY REFERENCES locations(location_id) ON DELETE CASCADE,
  popup_title TEXT,
  popup_description TEXT,
  show_sensors TEXT[], -- Which sensors to display: ['ph', 'turbidity', 'temperature', 'tds']
  custom_fields JSONB, -- Any additional data: {"district": "Karur", "population": "15000"}
  show_last_updated BOOLEAN DEFAULT true,
  show_view_button BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE popup_config ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read popup_config" ON popup_config
  FOR SELECT USING (true);

-- Allow authenticated users to modify
CREATE POLICY "Authenticated modify popup_config" ON popup_config
  FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON popup_config TO anon;
GRANT ALL ON popup_config TO authenticated;

-- ============================================
-- INSERT DEFAULT CONFIGURATIONS
-- ============================================

-- For existing locations
INSERT INTO popup_config (location_id, popup_title, show_sensors, custom_fields) VALUES
  ('nallampatti', 'Nallampatti Village', ARRAY['ph', 'turbidity', 'temperature', 'tds'], 
   '{"district": "Erode", "cluster": "Nallampatti Cluster"}'::jsonb),
  
  ('poolampatti', 'Poolampatti Village', ARRAY['ph', 'turbidity', 'temperature', 'tds'],
   '{"district": "Erode", "cluster": "Nallampatti Cluster"}'::jsonb),
  
  ('thumbalpatti', 'Thumbalpatti Village', ARRAY['ph', 'turbidity', 'temperature', 'tds'],
   '{"district": "Erode", "cluster": "Nallampatti Cluster"}'::jsonb),
  
  ('karipatti', 'Karipatti Village', ARRAY['ph', 'turbidity', 'temperature', 'tds'],
   '{"district": "Erode", "cluster": "Nallampatti Cluster"}'::jsonb),
  
  ('mallamooppampatti', 'Mallamooppampatti Village', ARRAY['ph', 'turbidity', 'temperature', 'tds'],
   '{"district": "Erode", "cluster": "Nallampatti Cluster"}'::jsonb),
  
  ('ukkadam', 'Ukkadam', ARRAY['ph', 'turbidity', 'temperature', 'tds'],
   '{"district": "Coimbatore", "type": "Urban"}'::jsonb),
  
  ('singanallur', 'Singanallur', ARRAY['ph', 'turbidity', 'temperature', 'tds'],
   '{"district": "Coimbatore", "type": "Urban"}'::jsonb),
  
  ('redhills', 'Red Hills', ARRAY['ph', 'turbidity', 'temperature', 'tds'],
   '{"district": "Chennai", "type": "Reservoir"}'::jsonb),
  
  ('porur', 'Porur', ARRAY['ph', 'turbidity', 'temperature', 'tds'],
   '{"district": "Chennai", "type": "Urban"}'::jsonb)
ON CONFLICT (location_id) DO UPDATE SET
  popup_title = EXCLUDED.popup_title,
  show_sensors = EXCLUDED.show_sensors,
  custom_fields = EXCLUDED.custom_fields,
  updated_at = NOW();

-- ============================================
-- EXAMPLE: Adding new village configuration
-- ============================================

-- When you add a new village (e.g., Aravakurichi):
/*
INSERT INTO popup_config (location_id, popup_title, popup_description, show_sensors, custom_fields)
VALUES (
  'aravakurichi',
  'Aravakurichi Water Quality Station',
  'Real-time monitoring of village water supply',
  ARRAY['ph', 'turbidity', 'temperature', 'tds'],
  '{"district": "Karur", "population": "15000", "source": "River Cauvery"}'::jsonb
);
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- View all popup configurations
SELECT 
  pc.location_id,
  pc.popup_title,
  pc.show_sensors,
  pc.custom_fields,
  l.name as location_name,
  l.latitude,
  l.longitude
FROM popup_config pc
JOIN locations l ON pc.location_id = l.location_id
ORDER BY pc.location_id;

-- Test query: Get popup data for a specific location
SELECT 
  pc.*,
  l.name,
  l.latitude,
  l.longitude
FROM popup_config pc
JOIN locations l ON pc.location_id = l.location_id
WHERE pc.location_id = 'karipatti';
