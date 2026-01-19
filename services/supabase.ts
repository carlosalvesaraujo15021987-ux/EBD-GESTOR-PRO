
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fxszhbmjqypvyifyhjrz.supabase.co';
const supabaseKey = 'sb_publishable_22094JqE6dRsr4gnUdElEg_9Cdizkwh';

export const supabase = createClient(supabaseUrl, supabaseKey);
