-- Demo Seed Data: Ah Ma Chen (78, Singapore)
-- Note: Replace UUIDs with actual IDs if running manually, or use as template.

-- 1. Patient Profile
INSERT INTO patient_profiles (patient_id, section_name, content)
VALUES 
('d0000000-0000-0000-0000-000000000000', 'Childhood', 'Grew up in a shophouse in Chinatown. Background in sewing and embroidery.'),
('d0000000-0000-0000-0000-000000000000', 'Family', 'Husband was a clerk. Two children, one living in Australia, one in Toa Payoh. Grandson name is Wei Kang.'),
('d0000000-0000-0000-0000-000000000000', 'Interests', 'Loves Teresa Teng songs and Cantonese opera. Enjoys dim sum at Red Star Restaurant.');

-- 2. Cognitive Trends (14 Days)
-- High scores first, then a slight dip toward the end
INSERT INTO cognitive_scores (patient_id, word_count, speech_rate, filler_count, overall_score, created_at)
SELECT 
  'd0000000-0000-0000-0000-000000000000',
  120 + (random() * 20), -- word_count
  1.5 + (random() * 0.2), -- speech_rate
  2 + (random() * 3), -- filler_count
  85 - (i * 1.5), -- declining overall_score
  NOW() - (i || ' days')::interval
FROM generate_series(0, 13) i;

-- 3. Exercise Scores
INSERT INTO exercise_scores (patient_id, exercise_type, score, max_score, created_at)
VALUES
('d0000000-0000-0000-0000-000000000000', 'naming', 8, 10, NOW() - INTERVAL '1 day'),
('d0000000-0000-0000-0000-000000000000', 'recall', 3, 5, NOW() - INTERVAL '2 days'),
('d0000000-0000-0000-0000-000000000000', 'fluency', 12, 15, NOW() - INTERVAL '3 days');

-- 4. Initial Chat Messages
INSERT INTO chat_messages (patient_id, role, content, created_at)
VALUES
('d0000000-0000-0000-0000-000000000000', 'assistant', 'Good morning Ah Ma! Did you have your breakfast today?', NOW() - INTERVAL '2 hours'),
('d0000000-0000-0000-0000-000000000000', 'user', 'Yes, I had some kaya toast and kopi-o.', NOW() - INTERVAL '1 hour 55 minutes');
