import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// Manually load .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    const envConfig = require('dotenv').parse(fs.readFileSync(envLocalPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

console.log('--- Supabase Access Verification ---');
console.log('Project URL from env:', projectUrl);
console.log('Token present:', !!token ? 'Yes' : 'No');

if (!token) {
    console.error('Error: SUPABASE_ACCESS_TOKEN not found in environment.');
    process.exit(1);
}

async function checkAccess() {
    try {
        const response = await fetch('https://api.supabase.com/v1/projects', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            console.error('Failed to list projects via Management API.');
            console.error('Status:', response.status, response.statusText);
            const body = await response.text();
            console.error('Body:', body);
            return;
        }

        const projects = await response.json();
        console.log('Successfully authenticated with Supabase Management API.');
        console.log('Projects found:', projects.length);

        const targetRef = projectUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
        if (targetRef) {
            const found = projects.find((p: any) => p.id === targetRef);
            if (found) {
                console.log(`SUCCESS: Project '${targetRef}' found in your account.`);
                console.log('Project Status:', found.status);
                console.log('Project Name:', found.name);
            } else {
                console.warn(`WARNING: Project '${targetRef}' (from .env) was NOT found in the list of projects accessible with this token.`);
                console.log('Available Project IDs:', projects.map((p: any) => p.id).join(', '));
            }
        } else {
            console.warn('Could not parse project ref from URL:', projectUrl);
        }

    } catch (err) {
        console.error('Error during verification:', err);
    }
}

checkAccess();
