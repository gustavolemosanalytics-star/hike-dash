import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

const spreadsheetId = '179Ghzm8LgDW0gs6qhD7Ti_a_c1BER_4suBajPS3Wgi0';

function getAuth() {
    // First try environment variable (for Vercel deployment)
    const envCreds = process.env.GOOGLE_CREDENTIALS;
    if (envCreds) {
        console.log('GoogleAuth: Found GOOGLE_CREDENTIALS environment variable');
        try {
            let credentialsStr = envCreds.trim();

            // Remove surround quotes if they exist (common Vercel/Copy-Paste issue)
            if (credentialsStr.startsWith('"') && credentialsStr.endsWith('"')) {
                credentialsStr = credentialsStr.substring(1, credentialsStr.length - 1);
            }
            // Remove surround single quotes
            else if (credentialsStr.startsWith("'") && credentialsStr.endsWith("'")) {
                credentialsStr = credentialsStr.substring(1, credentialsStr.length - 1);
            }

            // Handle accidental backslash escapes from some shells
            credentialsStr = credentialsStr.replace(/\\"/g, '"');

            // Handle base64 if it doesn't look like JSON
            if (!credentialsStr.startsWith('{')) {
                try {
                    const decoded = Buffer.from(credentialsStr, 'base64').toString();
                    if (decoded.startsWith('{')) credentialsStr = decoded;
                } catch (e) { }
            }

            const credentials = JSON.parse(credentialsStr);

            // Crucial: Fix private key newlines
            if (credentials.private_key && typeof credentials.private_key === 'string') {
                // Ensure it has actual newlines, not literal \n strings
                credentials.private_key = credentials.private_key.split('\\n').join('\n');
            }

            console.log('GoogleAuth: Successfully parsed credentials for service account:', credentials.client_email);

            return new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });
        } catch (e: any) {
            console.error('GoogleAuth: FATAL ERROR parsing GOOGLE_CREDENTIALS:', e.message);
            console.log('GoogleAuth: Raw Env Var (first 20 chars):', envCreds.substring(0, 20) + '...');
        }
    }

    // Plan B: Try individual environment variables (Common backup for Vercel)
    if (process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
        console.log('GoogleAuth: Found individual email/key environment variables. Using Plan B.');
        try {
            const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY.split('\\n').join('\n');
            return new google.auth.GoogleAuth({
                credentials: {
                    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
                    private_key: privateKey,
                },
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });
        } catch (e: any) {
            console.error('GoogleAuth: Error using individual env vars:', e.message);
        }
    } else {
        console.warn('GoogleAuth: GOOGLE_CREDENTIALS or individual params not found in environment.');
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

// Fetch data from a specific spreadsheet (for budget data)
export async function getGoogleSheetsDataFromSpreadsheet(targetSpreadsheetId: string, range: string) {
    try {
        const auth = getAuth();
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client as any });

        console.log(`getGoogleSheetsDataFromSpreadsheet: Fetching from ${targetSpreadsheetId}, range "${range}"...`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: targetSpreadsheetId,
            range,
        });

        if (!response.data.values) {
            console.warn(`getGoogleSheetsDataFromSpreadsheet: No data found`);
            return [];
        }

        console.log(`getGoogleSheetsDataFromSpreadsheet: Successfully fetched ${response.data.values.length} rows`);
        return response.data.values;
    } catch (error: any) {
        console.error('Error fetching from spreadsheet:', error.message);
        return null;
    }
}

// Get sheet names from a specific spreadsheet
export async function getSheetNamesFromSpreadsheet(targetSpreadsheetId: string) {
    try {
        const auth = getAuth();
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client as any });

        const response = await sheets.spreadsheets.get({
            spreadsheetId: targetSpreadsheetId
        });
        return response.data.sheets?.map(s => s.properties?.title) || [];
    } catch (error) {
        console.error('Error fetching sheet names from spreadsheet:', error);
        return [];
    }
}
