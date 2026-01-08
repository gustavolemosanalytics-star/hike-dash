import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

const spreadsheetId = '179Ghzm8LgDW0gs6qhD7Ti_a_c1BER_4suBajPS3Wgi0';

function getAuth() {
    // First try environment variable (for Vercel deployment)
    if (process.env.GOOGLE_CREDENTIALS) {
        console.log('GoogleAuth: Found GOOGLE_CREDENTIALS environment variable');
        try {
            let credentials;
            if (typeof process.env.GOOGLE_CREDENTIALS === 'string') {
                // If it starts with '{', it's likely a JSON string
                if (process.env.GOOGLE_CREDENTIALS.trim().startsWith('{')) {
                    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
                } else {
                    // It might be a base64 encoded string or something else, but we expect JSON
                    console.error('GoogleAuth: GOOGLE_CREDENTIALS is a string but does not look like JSON');
                    throw new Error('GOOGLE_CREDENTIALS environment variable is not a valid JSON string');
                }
            } else {
                credentials = process.env.GOOGLE_CREDENTIALS;
            }

            console.log('GoogleAuth: Initializing with service account:', credentials.client_email);

            return new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });
        } catch (e: any) {
            console.error('GoogleAuth: Error processing GOOGLE_CREDENTIALS:', e.message);
        }
    } else {
        console.warn('GoogleAuth: GOOGLE_CREDENTIALS environment variable NOT found');
    }

    // Fallback to file (for local development)
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    if (fs.existsSync(credentialsPath)) {
        console.log('GoogleAuth: Found credentials.json file at', credentialsPath);
        return new google.auth.GoogleAuth({
            keyFile: credentialsPath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
    } else {
        console.error('GoogleAuth: credentials.json file NOT found at', credentialsPath);
    }

    throw new Error('No Google credentials found. Please set GOOGLE_CREDENTIALS env var or add credentials.json file.');
}

export async function getSheetNames() {
    try {
        const auth = getAuth();
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client as any });

        const response = await sheets.spreadsheets.get({
            spreadsheetId
        });
        return response.data.sheets?.map(s => s.properties?.title) || [];
    } catch (error) {
        console.error('Error fetching sheet names:', error);
        return [];
    }
}

export async function getGoogleSheetsData(range: string) {
    try {
        const auth = getAuth();
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client as any });

        console.log(`getGoogleSheetsData: Fetching range "${range}"...`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        if (!response.data.values) {
            console.warn(`getGoogleSheetsData: No data found for range "${range}"`);
            return [];
        }

        console.log(`getGoogleSheetsData: Successfully fetched ${response.data.values.length} rows`);
        return response.data.values;
    } catch (error: any) {
        console.error('Error fetching Google Sheets data:', error.message);
        return null;
    }
}
