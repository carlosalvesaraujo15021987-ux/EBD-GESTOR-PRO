
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tgqqxxsbbprgxaczpxop.supabase.co';
const supabaseKey = 'sb_publishable_9oetLo1VrBAzte35BUONuQ_JmMenv-v';

export const supabase = createClient(supabaseUrl, supabaseKey);
