import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_USER_ID = 'd0000000-0000-0000-0000-000000000000'; // Placeholder for demo

async function seedData() {
  console.log('Seeding 14 days of demo data for Ah Ma Chen...');

  // 1. Create or verify User Profile
  const { error: userError } = await supabase
    .from('user_profiles')
    .upsert({
      id: TEST_USER_ID,
      role: 'patient',
      display_name: 'Ah Ma Chen',
      preferred_language: 'zh'
    });

  if (userError) {
    console.warn('Could not upsert user profile (ignore if running without real DB):', userError.message);
  }

  // 2. Cognitive Scores (14 Days)
  const scores = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Create a subtle decline trend for the demo
    const baseline = 85;
    const noise = Math.random() * 5;
    const decline = i * 0.8;
    const finalScore = Math.max(baseline - decline + noise, 40);

    scores.push({
      patient_id: TEST_USER_ID,
      recorded_at: date.toISOString(),
      word_count: 100 + Math.floor(Math.random() * 50),
      speech_rate: 1.4 + (Math.random() * 0.4),
      type_token_ratio: 0.6 + (Math.random() * 0.1),
      wellness_score: finalScore
    });
  }

  const { error: scoreError } = await supabase.from('cognitive_scores').insert(scores);
  if (scoreError) console.error('Error seeding scores:', scoreError.message);

  // 3. Exercise Scores
  const exercises = [
    { patient_id: TEST_USER_ID, exercise_type: 'object_naming', score: 90, max_score: 100, difficulty_level: 2 },
    { patient_id: TEST_USER_ID, exercise_type: 'word_recall', score: 60, max_score: 100, difficulty_level: 1 },
    { patient_id: TEST_USER_ID, exercise_type: 'category_fluency', score: 12, max_score: 20, difficulty_level: 1 },
  ];

  const { error: exError } = await supabase.from('exercise_scores').insert(exercises);
  if (exError) console.error('Error seeding exercises:', exError.message);

  console.log('Seeding complete!');
}

seedData();
