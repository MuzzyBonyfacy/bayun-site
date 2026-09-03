const SUPABASE_URL = 'https://aahxnfhpwqhosayxbmqj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_43t92RrUifHcfWSxqbpVIA_evczkniw';

const SupabaseAPI = {
    async insert(table, data) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async upsert(table, data, onConflict) {
        const params = onConflict ? `?on_conflict=${onConflict}` : '';
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'resolution=merge-duplicates,return=representation'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async select(table, params = '') {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        return await response.json();
    }
};