import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fjkgryfkeyqqcgpemvic.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_kqY6iSy79oDQkzLdKeoEiA_8tgIsnJN'
const SITE_URL = 'https://terreiropaibeneditodocongo.com.br/'

// link de "esqueci minha senha": precisa ser lido antes do cliente limpar o endereço
export const IS_PASSWORD_RECOVERY = typeof window !== 'undefined' && /type=recovery/.test(window.location.hash || '')
export const APP_URL = SITE_URL

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    redirectTo: SITE_URL,
  },
})
