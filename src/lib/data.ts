import { getGoogleSheetsData, getSheetNames } from './googleSheets';
import { parse, isValid } from 'date-fns';

export interface Transaction {
    date: string; // ISO string YYYY-MM-DD
    rawDate: string;
    type: string;
    amount: number;
    bu: string;
    macroCategory: string;
    group: string;
    project: string;
    cluster: string;
    status: string;
    paidAmount: number;
    pendingAmount: number;
    client: string;
    docId: string; // CNPJ or CPF
}

// Simple in-memory cache
let cache: { data: Transaction[]; timestamp: number } | null = null;
const CACHE_TTL = 300 * 1000; // 5 minutes

export async function fetchTransactions(): Promise<Transaction[]> {
    const now = Date.now();
    if (cache && (now - cache.timestamp < CACHE_TTL)) {
        return cache.data;
    }

    const targetSheet = "'Bdados Tratada Fchto 2025'";
    let range = `${targetSheet}!A:Z`;
    let rows = await getGoogleSheetsData(range);

    if (!rows || rows.length < 2) {
        console.warn(`fetchTransactions: Failed to fetch from "${targetSheet}". Trying fallback search...`);
        const sheets = await getSheetNames();
        console.log(`fetchTransactions: Found available sheets in spreadsheet:`, sheets);

        // Find a sheet that starts with "Bdados" (the most likely name)
        const possibleSheet = sheets.find(s => s?.toLowerCase().includes('bdados'));

        if (possibleSheet) {
            console.log(`fetchTransactions: Automatically selected best match sheet: "${possibleSheet}"`);
            range = `'${possibleSheet}'!A:Z`;
            rows = await getGoogleSheetsData(range);
        } else if (sheets.length > 0) {
            console.log(`fetchTransactions: No Bdados sheet found. Falling back to FIRST sheet: "${sheets[0]}"`);
            range = `'${sheets[0]}'!A:Z`;
            rows = await getGoogleSheetsData(range);
        }
    }

    if (!rows || rows.length < 2) {
        console.error('fetchTransactions: FAILED TO FIND ANY DATA IN ANY SHEET.');
        return [];
    }
    console.log(`fetchTransactions: Successfully fetched ${rows.length} rows.`);

    const headers = rows[0];
    const dataRows = rows.slice(1);
    console.log(`fetchTransactions: Processing ${dataRows.length} data rows`);

    const idx = {
        date: headers.indexOf('Data'),
        type: headers.indexOf('Tipo'),
        amount: headers.indexOf('Valor'),
        bu: headers.indexOf('BU'),
        macro: headers.indexOf('MacroCategoria'),
        group: headers.indexOf('Grupo'),
        project: headers.indexOf('Projeto'),
        cluster: headers.indexOf('Cluster'),
        status: headers.indexOf('Status FIN'),
        paidAmount: headers.indexOf('Pago ou Recebido'),
        pendingAmount: headers.indexOf('A Pagar ou Receber'),
        client: headers.indexOf('Cliente ou Fornecedor'),
        // Try to find CNPJ/CPF column
        docId: headers.findIndex((h: string) => h.includes('CNPJ') || h.includes('CPF') || h.includes('Documento')),
    };

    const cleanCurrency = (val: string) => {
        if (!val) return 0;
        let clean = val.replace('R$', '').trim();
        clean = clean.replace(/\./g, '');
        clean = clean.replace(',', '.');
        clean = clean.replace(/\s/g, '');
        return parseFloat(clean) || 0;
    };

    const data = dataRows.map(row => {
        const amount = cleanCurrency(row[idx.amount]);
        const paidAmount = cleanCurrency(row[idx.paidAmount]);
        const pendingAmount = cleanCurrency(row[idx.pendingAmount]);

        const rawDate = row[idx.date] || '';
        let isoDate = '';

        if (rawDate) {
            try {
                const parsedDate = parse(rawDate, 'dd/MM/yyyy', new Date());
                if (isValid(parsedDate)) {
                    isoDate = parsedDate.toISOString();
                }
            } catch (e) {
                // keep empty
            }
        }

        return {
            date: isoDate,
            rawDate,
            type: row[idx.type] || '',
            amount,
            bu: row[idx.bu] || 'N/D',
            macroCategory: row[idx.macro] || '',
            group: row[idx.group] || '',
            project: row[idx.project] || '',
            cluster: row[idx.cluster] || '',
            status: row[idx.status] || '',
            paidAmount,
            pendingAmount,
            client: row[idx.client] || 'N/D',
            docId: idx.docId !== -1 ? (row[idx.docId] || '') : ''
        };
    });

    cache = { data, timestamp: now };
    return data;
}
