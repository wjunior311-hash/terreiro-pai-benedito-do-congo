import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fjkgryfkeyqqcgpemvic.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_kqY6iSy79oDQkzLdKeoEiA_8tgIsnJN'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
