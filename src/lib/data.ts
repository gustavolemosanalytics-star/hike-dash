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

    // Optimized Sheet Discovery
    // 1. Get all sheet names first to avoid "Unable to parse range" errors
    const sheets = await getSheetNames();
    console.log('fetchTransactions: Available sheets in spreadsheet:', sheets);

    // 2. Strategy: Find the best matching sheet
    let selectedSheet = '';
    const targetName = "Bdados Tratada Fchto 2025";

    // A. Clean match (ignore case and extra spaces)
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');
    const normalizedTarget = normalize(targetName);

    selectedSheet = sheets.find(s => s && normalize(s) === normalizedTarget) || '';

    // B. Partial match for "bdados" + "2025"
    if (!selectedSheet) {
        selectedSheet = sheets.find(s => s && s.toLowerCase().includes('bdados') && s.includes('2025')) || '';
    }

    // C. Any "bdados" sheet
    if (!selectedSheet) {
        selectedSheet = sheets.find(s => s && s.toLowerCase().includes('bdados')) || '';
    }

    // D. First sheet fallback
    if (!selectedSheet && sheets.length > 0) {
        selectedSheet = sheets[0] || '';
        console.warn('fetchTransactions: No specific sheet matched. Defaulting to first sheet:', selectedSheet);
    }

    if (!selectedSheet) {
        console.error('fetchTransactions: CRITICAL - No executable sheet found.');
        return [];
    }

    console.log(`fetchTransactions: Selected sheet for data: "${selectedSheet}"`);
    const range = `'${selectedSheet}'!A:ZZ`;

    // 3. Fetch data from the specifically identified sheet
    let rows = await getGoogleSheetsData(range);

    if (!rows || rows.length < 2) {
        console.error('fetchTransactions: FAILED TO FIND ANY DATA IN ANY SHEET.');
        return [];
    }
    console.log(`fetchTransactions: Successfully fetched ${rows.length} rows.`);

    // Dynamic Header Detection: Search first 5 rows for the header line
    // We look for a row that contains "Data" and ("BU" or "Valor" or "Tipo")
    let headerRowIndex = 0;
    const candidates = rows.slice(0, 5);
    headerRowIndex = candidates.findIndex(row =>
        row.some((cell: string) => typeof cell === 'string' && cell.toLowerCase().includes('data')) &&
        row.some((cell: string) => typeof cell === 'string' && (cell.toLowerCase().includes('bu') || cell.toLowerCase().includes('business')))
    );

    if (headerRowIndex === -1) {
        console.warn('fetchTransactions: Could not detect header row automatically. Defaulting to row 0.');
        headerRowIndex = 0;
    } else {
        console.log(`fetchTransactions: Detected header row at index ${headerRowIndex}`);
    }

    const headers = rows[headerRowIndex];
    const dataRows = rows.slice(headerRowIndex + 1);
    console.log(`fetchTransactions: Processing ${dataRows.length} data rows`);

    // Flexible index finder helper with Exact Match Priority
    const findIdx = (possibleNames: string[]) => {
        // 1. Try EXACT match (case-insensitive)
        const exactIdx = headers.findIndex((h: string) =>
            possibleNames.some(name => h.trim().toLowerCase() === name.toLowerCase())
        );
        if (exactIdx !== -1) return exactIdx;

        // 2. Try Partial match
        return headers.findIndex((h: string) =>
            possibleNames.some(name => h.toLowerCase().includes(name.toLowerCase()))
        );
    };

    const idx = {
        date: findIdx(['Data']),
        type: findIdx(['Tipo']),
        amount: findIdx(['Valor', 'Quantia', 'Total', 'R$']),
        bu: findIdx(['BU', 'Unidade', 'Business', 'Unidade de Negócio', 'Unit']),
        macro: findIdx(['Macro', 'Categoria']),
        group: findIdx(['Grupo']),
        project: findIdx(['Projeto']),
        cluster: findIdx(['Cluster']),
        status: findIdx(['Status', 'Situação', 'FIN']),
        paidAmount: findIdx(['Pago', 'Recebido', 'Liquidado', 'Realizado']),
        pendingAmount: findIdx(['Pagar', 'Receber', 'Pendente', 'Aberto']),
        client: findIdx(['Cliente', 'Fornecedor', 'Parceiro', 'Nome']),
        docId: findIdx(['CNPJ', 'CPF', 'Documento', 'ID', 'Inscrição']),
    };

    // If amount is not found by name, try to FIND IT by content (fallback)
    if (idx.amount === -1 && dataRows.length > 0) {
        console.log('fetchTransactions: Amount header NOT found. Scanning first 5 rows for numeric/currency content...');
        const firstRow = dataRows[0];
        const contentBasedIdx = firstRow.findIndex((cell: any) => {
            if (!cell) return false;
            const str = String(cell);
            // Matches numbers with currency or common numeric patterns
            return str.includes('R$') || (str.includes(',') && str.match(/\d/));
        });

        if (contentBasedIdx !== -1) {
            console.log(`fetchTransactions: Auto-detected AMOUNT column at index ${contentBasedIdx} based on content: "${firstRow[contentBasedIdx]}"`);
            idx.amount = contentBasedIdx;
        }
    }

    console.log('fetchTransactions: Final Mapping:', Object.entries(idx).map(([k, v]) => `${k}:${v}`).join(', '));

    // Check if critical columns were found
    if (idx.amount === -1 || idx.date === -1) {
        console.error('fetchTransactions: CRITICAL: Essential columns missing!', {
            foundAmount: idx.amount,
            foundDate: idx.date,
            headers: headers.slice(0, 15) // Log first 15 headers for context
        });
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
