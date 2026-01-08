import { getGoogleSheetsData } from './googleSheets';
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

    const sheetName = "'Bdados Tratada Fchto 2025'";
    const range = `${sheetName}!A:Z`;
    const rows = await getGoogleSheetsData(range);
    console.log(`fetchTransactions: Fetched ${rows?.length || 0} rows from range "${range}"`);

    if (!rows || rows.length < 2) {
        console.warn(`fetchTransactions: No data found in range "${range}"`);
        return [];
    }

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
