const SUPABASE_URL = 'https://aahxnfhpwqhosayxbmqj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_43t92RrUifHcfWSxqbpVIA_evczkniw';

let supabase = null;
if (window.supabase && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error('Supabase client not loaded');
}