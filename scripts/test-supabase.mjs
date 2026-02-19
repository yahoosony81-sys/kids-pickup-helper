import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    console.error('Supabase URL missing');
    process.exit(1);
}

try {
    const hostname = new URL(supabaseUrl).hostname;
    console.log(`Resolving ${hostname}...`);
    const address = await lookup(hostname);
    console.log(`Resolved: ${JSON.stringify(address)}`);

    // Also try IPv4 specifically
    const address4 = await lookup(hostname, { family: 4 });
    console.log(`Resolved IPv4: ${JSON.stringify(address4)}`);
} catch (e) {
    console.error('DNS Lookup failed:', e);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

try {
    const { data, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Supabase Error:', error);
    } else {
        console.log('Success! Connection works.');
    }
} catch (err) {
    console.error('Fetch Error:', err);
    if (err.cause) {
        console.error('Cause:', err.cause);
    }
}
