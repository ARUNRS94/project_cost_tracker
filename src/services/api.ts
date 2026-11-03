/**
 * Project Code Tracker - Unified API & Backend Integration Service
 * Configured for Supabase PostgREST & Custom REST Backends with LocalStorage fallback
 */

import {
  ClientMaster,
  ProjectMaster,
  ItemTypeMaster,
  ItemMaster,
  ExpenseCategoryMaster,
  VendorMaster,
  UserMaster,
  RoleMaster,
  UserRoleMapping,
  ExpenseMaster,
  QuotationMaster,
} from '../types/erp';

// Environment configurations
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '';

const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
const isCustomApiConfigured = Boolean(API_BASE_URL);

/**
 * Generic Fetcher with Authorization Header
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (isSupabaseConfigured) {
    url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    headers['apikey'] = SUPABASE_KEY;
    headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
    headers['Prefer'] = 'return=representation';
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }
  return response.json();
}

/**
 * Client Master API
 */
export const clientsApi = {
  async getAll(): Promise<ClientMaster[]> {
    if (!isSupabaseConfigured && !isCustomApiConfigured) return [];
    return apiRequest<ClientMaster[]>('clients?select=*&order=id.asc');
  },
  async create(data: Omit<ClientMaster, 'id'>): Promise<ClientMaster> {
    if (!isSupabaseConfigured && !isCustomApiConfigured) {
      throw new Error('Backend not configured');
    }
    const res = await apiRequest<ClientMaster[]>('clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res[0];
  },
  async update(id: number, data: Partial<ClientMaster>): Promise<ClientMaster> {
    const res = await apiRequest<ClientMaster[]>(`clients?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res[0];
  },
  async delete(id: number): Promise<void> {
    await apiRequest(`clients?id=eq.${id}`, { method: 'DELETE' });
  },
};

/**
 * Project Master API
 */
export const projectsApi = {
  async getAll(): Promise<ProjectMaster[]> {
    if (!isSupabaseConfigured && !isCustomApiConfigured) return [];
    return apiRequest<ProjectMaster[]>('projects?select=*&order=id.asc');
  },
  async create(data: Omit<ProjectMaster, 'id'>): Promise<ProjectMaster> {
    const res = await apiRequest<ProjectMaster[]>('projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res[0];
  },
  async update(id: number, data: Partial<ProjectMaster>): Promise<ProjectMaster> {
    const res = await apiRequest<ProjectMaster[]>(`projects?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res[0];
  },
  async delete(id: number): Promise<void> {
    await apiRequest(`projects?id=eq.${id}`, { method: 'DELETE' });
  },
};

/**
 * Expense Master API
 */
export const expensesApi = {
  async getAll(): Promise<ExpenseMaster[]> {
    if (!isSupabaseConfigured && !isCustomApiConfigured) return [];
    return apiRequest<ExpenseMaster[]>('expenses?select=*&order=expense_date.desc,id.desc');
  },
  async create(data: Omit<ExpenseMaster, 'id'>): Promise<ExpenseMaster> {
    const res = await apiRequest<ExpenseMaster[]>('expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res[0];
  },
  async update(id: number, data: Partial<ExpenseMaster>): Promise<ExpenseMaster> {
    const res = await apiRequest<ExpenseMaster[]>(`expenses?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res[0];
  },
  async delete(id: number): Promise<void> {
    await apiRequest(`expenses?id=eq.${id}`, { method: 'DELETE' });
  },
};

/**
 * Quotation Master API
 */
export const quotationsApi = {
  async getAll(): Promise<QuotationMaster[]> {
    if (!isSupabaseConfigured && !isCustomApiConfigured) return [];
    return apiRequest<QuotationMaster[]>('quotations?select=*&order=id.desc');
  },
  async create(data: Omit<QuotationMaster, 'id'>): Promise<QuotationMaster> {
    const res = await apiRequest<QuotationMaster[]>('quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res[0];
  },
  async update(id: number, data: Partial<QuotationMaster>): Promise<QuotationMaster> {
    const res = await apiRequest<QuotationMaster[]>(`quotations?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res[0];
  },
  async delete(id: number): Promise<void> {
    await apiRequest(`quotations?id=eq.${id}`, { method: 'DELETE' });
  },
};

/**
 * Export Expenses as CSV format
 */
export function exportExpensesCSV(
  expenses: ExpenseMaster[],
  getProject: (id?: number) => ProjectMaster | undefined,
  getCategory: (id?: number) => ExpenseCategoryMaster | undefined,
  getVendor: (id?: number) => VendorMaster | undefined,
  getUser: (id?: number) => UserMaster | undefined
): string {
  const headers = [
    'Expense Date',
    'Project Name',
    'Expense Category',
    'Description',
    'Vendor Name',
    'Quantity',
    'Unit',
    'Rate (INR)',
    'Amount (INR)',
    'Payment Status',
    'Payment Mode',
    'Reference / Invoice No',
    'Remarks',
    'Created By',
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = expenses.map((e) => [
    e.expense_date,
    getProject(e.project_id)?.project_name || 'Direct Project',
    getCategory(e.expense_category_id)?.category_name || 'General',
    e.description,
    getVendor(e.vendor_id)?.vendor_name || 'Direct Supplier',
    e.quantity ?? '',
    e.unit ?? '',
    e.rate ?? '',
    e.amount,
    e.payment_status,
    e.payment_mode,
    e.reference_number || '',
    e.remarks || '',
    getUser(e.created_by)?.full_name || 'System User',
  ]);

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\r\n');

  return csvContent;
}

/**
 * Trigger browser file download
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generic Master CSV Exporter
 */
export function exportMasterToCSV(masterName: string, items: any[]): string {
  if (!items || items.length === 0) return '';
  const keys = Object.keys(items[0]);
  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const headerRow = keys.map((k) => escapeCSV(k)).join(',');
  const dataRows = items.map((item) =>
    keys.map((k) => escapeCSV(item[k])).join(',')
  );

  return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Basic CSV Parser into array of objects
 */
export function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseRow(line);
    const obj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] ?? '';
    });
    return obj;
  });
}
