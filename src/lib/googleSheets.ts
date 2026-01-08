import { google } from 'googleapis';
import path from 'path';

const spreadsheetId = '179Ghzm8LgDW0gs6qhD7Ti_a_c1BER_4suBajPS3Wgi0';

function getAuth() {
    return new google.auth.GoogleAuth({
        keyFile: path.join(process.cwd(), 'credentials.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
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
