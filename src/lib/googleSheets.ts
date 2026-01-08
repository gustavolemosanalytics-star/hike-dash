import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

const spreadsheetId = '179Ghzm8LgDW0gs6qhD7Ti_a_c1BER_4suBajPS3Wgi0';

function getAuth() {
    // First try environment variable (for Vercel deployment)
    if (process.env.GOOGLE_CREDENTIALS) {
        try {
            const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
            return new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });
        } catch (e) {
            console.error('Error parsing GOOGLE_CREDENTIALS env var:', e);
        }
    }

    // Fallback to file (for local development)
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    if (fs.existsSync(credentialsPath)) {
        return new google.auth.GoogleAuth({
            keyFile: credentialsPath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
    }

    throw new Error('No Google credentials found. Set GOOGLE_CREDENTIALS env var or add credentials.json file.');
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

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        return response.data.values;
    } catch (error) {
        console.error('Error fetching Google Sheets data:', error);
        return null;
    }
}
