
import { supabase } from '@/integrations/supabase/client';

export async function getBackgroundImages() {
  const { data, error } = await supabase
    .from('background_images')
    .select('*')
    .order('display_order');
  
  if (error) {
    console.error('Error fetching background images:', error);
    return [];
  }
  
  return data || [];
}

export async function getBackgroundImageById(id: string) {
  const { data, error } = await supabase
    .from('background_images')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error(`Error fetching background image with id ${id}:`, error);
    return null;
  }
  
  return data;
}
