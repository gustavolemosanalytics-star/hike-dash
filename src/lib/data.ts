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

    // Flexible index finder helper
    const findIdx = (possibleNames: string[]) => {
        return headers.findIndex((h: string) =>
            possibleNames.some(name => h.toLowerCase().includes(name.toLowerCase()))
        );
    };

    const idx = {
        date: findIdx(['Data']),
        type: findIdx(['Tipo']),
        amount: findIdx(['Valor', 'Quantia']),
        bu: findIdx(['BU', 'Unidade']),
        macro: findIdx(['Macro', 'Categoria']),
        group: findIdx(['Grupo']),
        project: findIdx(['Projeto']),
        cluster: findIdx(['Cluster']),
        status: findIdx(['Status', 'Situação']),
        paidAmount: findIdx(['Pago', 'Recebido', 'Liquidado']),
        pendingAmount: findIdx(['Pagar', 'Receber', 'Pendente']),
        client: findIdx(['Cliente', 'Fornecedor', 'Parceiro']),
        docId: findIdx(['CNPJ', 'CPF', 'Documento', 'ID']),
    };

    console.log(`fetchTransactions: Column mapping indices:`, idx);

    // Check if critical columns were found
    if (idx.amount === -1) {
        console.error('fetchTransactions: CRITICAL: Could not find "Valor" column in headers:', headers);
    }

    const cleanCurrency = (val: any) => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return val;

        let str = String(val);
        if (!str) return 0;

        // Check if it's already a standard float string (e.g., "1234.56")
        // but avoid false positives like "1.234" which might be thousands in Brazilian format
        const clean = str.replace('R$', '').replace(/\s/g, '').trim();

        // If it contains both comma and dot, it's definitely formatted
        if (clean.includes(',') && clean.includes('.')) {
            // Brazilian 1.234,56 -> 1234.56
            return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
        }

        // If it contains only a comma, it's likely Brazilian decimal (e.g., "1234,56")
        if (clean.includes(',') && !clean.includes('.')) {
            return parseFloat(clean.replace(',', '.')) || 0;
        }

        // Default fallback (existing logic)
        return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
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
