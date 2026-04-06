'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

const SECTIONS = [
  {
    id: 'childhood',
    title: 'Childhood & Early Life',
    placeholder: 'Where did they grow up? Which schools did they attend? Any memorable childhood stories?',
  },
  {
    id: 'family',
    title: 'Family',
    placeholder: 'Spouse, children, grandchildren names. Any special family traditions or stories?',
  },
  {
    id: 'career',
    title: 'Career & Work',
    placeholder: 'What was their occupation? Where did they work? Any proud work moments?',
  },
  {
    id: 'hobbies',
    title: 'Hobbies & Interests',
    placeholder: 'What do they love doing? Any hidden talents or lifelong passions?',
  },
  {
    id: 'food_places',
    title: 'Favorite Foods & Places',
    placeholder: 'Favorite hawker stalls, signature dishes, or places in Singapore they love visiting?',
  },
  {
    id: 'cultural',
    title: 'Cultural & Religious Background',
    placeholder: 'Which festivals do they celebrate? Any religious or cultural practices important to them?',
  },
  {
    id: 'important_people',
    title: 'Important People',
    placeholder: 'Friends, mentors, or historical figures they admire or mention often?',
  },
  {
    id: 'memories',
    title: 'Significant Life Memories',
    placeholder: 'Weddings, births, travels, or any key turning points in their life?',
  },
  {
    id: 'language',
    title: 'Language & Communication',
    placeholder: 'First language, dialects spoken, or preferred way of speaking (e.g. mix of Hokkien and English)?',
  }
];

export default function LifeStoryProfile() {
  const [profileData, setProfileData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Find the patient linked to this caregiver
        const { data: rel } = await supabase
          .from('care_relationships')
          .select('patient_id')
          .eq('caregiver_id', user.id)
          .single();

        if (rel) {
          const { data: profiles } = await supabase
            .from('patient_profiles')
            .select('section, content')
            .eq('patient_id', rel.patient_id);

          if (profiles) {
            const data: Record<string, string> = {};
            profiles.forEach(p => {
              data[p.section] = p.content;
            });
            setProfileData(data);
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: rel } = await supabase
        .from('care_relationships')
        .select('patient_id')
        .eq('caregiver_id', user.id)
        .single();

      if (!rel) throw new Error('No linked patient found');

      const patientId = rel.patient_id;

      // Prepare data for insertion
      const upsertData = Object.entries(profileData).map(([section, content]) => ({
        patient_id: patientId,
        section,
        content,
        updated_at: new Date().toISOString() // Should be handled by DB but being explicit
      }));

      // In a real implementation with Supabase, we would do a bulk upsert
      // But for simplicity and to match the schema requirements (one row per section)
      // we delete then insert. Or better yet, upsert with a unique constraint on (patient_id, section)
      
      const { error } = await supabase
        .from('patient_profiles')
        .upsert(
          Object.entries(profileData).map(([section, content]) => ({
            patient_id: patientId,
            section,
            content
          })),
          { onConflict: 'patient_id,section' }
        );

      if (error) throw error;

      // Trigger embedding creation
      await fetch('/api/embeddings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, profileData })
      });

      toast.success('Profile saved and indexed for AI');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-10 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Life Story Profile</h1>
          <p className="text-muted-foreground">
            Fill this out to help the AI understand your loved one's background and memories.
          </p>
        </div>
        <Button 
          size="lg" 
          onClick={handleSave} 
          disabled={saving}
          className="bg-primary hover:bg-primary/90"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Life Story
        </Button>
      </div>

      <div className="grid gap-6">
        {SECTIONS.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
              <CardDescription>{section.placeholder}</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={`Type here about ${section.title.toLowerCase()}...`}
                value={profileData[section.id] || ''}
                onChange={(e) => setProfileData(prev => ({ ...prev, [section.id]: e.target.value }))}
                className="min-h-[150px] text-base"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <Button size="lg" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
