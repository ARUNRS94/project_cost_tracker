import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  QuotationMaster,
  QuotationLineItem,
  QuotationFieldVisibility,
} from '../../types/erp';
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  Save,
  CheckSquare,
  Square,
  SlidersHorizontal,
  ChevronDown,
  Building,
  Image as ImageIcon,
  CheckCircle2,
  Download,
  Eye,
  Edit3,
  Layers,
  FolderKanban,
  Package,
  ExternalLink,
} from 'lucide-react';
import { downloadFile, exportMasterToCSV } from '../../services/api';

// Indian numbering system conversion helper
function numberToIndianWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + (n % 10 !== 0 ? a[n % 10] + ' ' : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + inWords(n % 100);
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand ' + inWords(n % 1000);
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh ' + inWords(n % 100000);
    return inWords(Math.floor(n / 10000000)) + ' Crore ' + inWords(n % 10000000);
  }

  const rounded = Math.round(num);
  return 'Rupees ' + inWords(rounded).trim() + ' Only';
}

export const QuotationGeneratorView: React.FC = () => {
  const {
    clients,
    projects,
    items: catalogItems,
    expenses,
    quotations,
    addQuotation,
    updateQuotation,
    currentUser,
  } = useERP();

  const [activeMode, setActiveMode] = useState<'editor' | 'preview'>('editor');
  const [selectedQuotationId, setSelectedQuotationId] = useState<number | null>(
    quotations[0]?.id || null
  );

  // Field selector toggles (user selects which fields are displayed on quotation)
  const [fieldVisibility, setFieldVisibility] = useState<QuotationFieldVisibility>({
    showSerialNo: true,
    showItemName: true,
    showReferencePic: true,
    showWorkLocationPic: false,
    showItemSize: true,
    showQuantity: true,
    showUnit: true,
    showRate: true,
    showDiscount: true,
    showGst: true,
    showRemarks: true,
    showLineTotal: true,
  });

  const [isFieldConfigOpen, setIsFieldConfigOpen] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Client Selection State
  const [clientId, setClientId] = useState<number | null>(clients[0]?.id || null);
  const [clientName, setClientName] = useState(clients[0]?.client_name || '');
  const [contactPerson, setContactPerson] = useState(clients[0]?.contact_person || '');
  const [phone, setPhone] = useState(clients[0]?.phone || '');
  const [email, setEmail] = useState(clients[0]?.email || '');
  const [address, setAddress] = useState(clients[0]?.address || '');
  const [gstin, setGstin] = useState(clients[0]?.gstin || '');

  // 1. Cascading filter: When a client is selected, show only projects for that client
  const availableProjects = useMemo(() => {
    if (!clientId) return [];
    return projects.filter((p) => p.client_id === clientId);
  }, [projects, clientId]);

  // Project Selection State
  const [projectId, setProjectId] = useState<number | null>(() => {
    const firstClientProjects = projects.filter((p) => p.client_id === (clients[0]?.id || 1));
    return firstClientProjects[0]?.id || null;
  });

  const [projectName, setProjectName] = useState(() => {
    const firstClientProjects = projects.filter((p) => p.client_id === (clients[0]?.id || 1));
    return firstClientProjects[0]?.project_name || '';
  });

  // Keep project selection synchronized if clientId changes
  useEffect(() => {
    if (!clientId) return;
    const clientProjects = projects.filter((p) => p.client_id === clientId);
    if (clientProjects.length > 0) {
      // If current projectId is not in this client's projects, switch to first project
      if (!clientProjects.some((p) => p.id === projectId)) {
        setProjectId(clientProjects[0].id);
        setProjectName(clientProjects[0].project_name);
      }
    } else {
      setProjectId(null);
      setProjectName('');
    }
  }, [clientId, projects]);

  // 2. Cascading filter: When a project is selected, show only items in that project
  const availableItems = useMemo(() => {
    if (!projectId) return [];
    return catalogItems.filter(
      (it) =>
        it.project_id === projectId ||
        expenses.some((e) => e.project_id === projectId && e.project_item_id === it.id)
    );
  }, [catalogItems, projectId, expenses]);

  // Quotation Meta
  const [quotationNumber, setQuotationNumber] = useState(
    `QT-${new Date().getFullYear()}-${String(Date.now() % 10000).padStart(4, '0')}`
  );
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [paymentTerms, setPaymentTerms] = useState(
    '50% advance along with confirmed work order, 40% on delivery of fabrications, 10% on completion.'
  );
  const [bankDetails, setBankDetails] = useState(
    'HDFC Bank Ltd | A/c: 50200034891102 | IFSC: HDFC0000128 | Current Account'
  );
  const [notes, setNotes] = useState(
    '1. Rates are valid for 30 days from date of issue.\n2. Taxes applicable as per GST regulations.\n3. Site electrical connection and scaffolding to be facilitated by client.'
  );
  const [status, setStatus] = useState<'Draft' | 'Sent' | 'Approved' | 'Rejected'>('Draft');

  // Quotation line items
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>(() => {
    const firstProjItems = catalogItems.filter((it) => it.project_id === 1);
    const seed = firstProjItems[0] || catalogItems[0];
    if (!seed) return [];
    return [
      {
        id: 1,
        item_id: seed.id,
        description: seed.item_name,
        reference_picture: seed.reference_picture,
        work_location_picture: seed.work_location_picture,
        item_size: seed.item_size,
        quantity: 1,
        unit: 'Sets',
        rate: seed.default_rate,
        discount_percent: 0,
        gst_percent: 18,
        remarks: seed.remark,
        amount: Math.round(seed.default_rate * 1.18),
      },
    ];
  });

  // Calculate line item total
  const computeItemAmount = (qty: number, rate: number, disc: number, gst: number) => {
    const discounted = qty * rate * (1 - disc / 100);
    return Math.round(discounted * (1 + gst / 100));
  };

  const handleUpdateLineItem = (index: number, field: keyof QuotationLineItem, value: any) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index], [field]: value };
      const qty = Number(cur.quantity) || 0;
      const rate = Number(cur.rate) || 0;
      const disc = Number(cur.discount_percent) || 0;
      const gst = Number(cur.gst_percent) || 0;
      cur.amount = computeItemAmount(qty, rate, disc, gst);
      updated[index] = cur;
      return updated;
    });
  };

  // Add item from project items list
  const handleAddProjectItem = (catalogId: number) => {
    const found = availableItems.find((it) => it.id === catalogId) || catalogItems.find((it) => it.id === catalogId);
    if (!found) return;

    const qty = 1;
    const rate = Number(found.default_rate) || 0;
    const disc = 0;
    const gst = 18;
    const nextId = Math.max(0, ...lineItems.map((i) => i.id)) + 1;

    const newItem: QuotationLineItem = {
      id: nextId,
      item_id: found.id,
      description: found.item_name,
      reference_picture: found.reference_picture,
      work_location_picture: found.work_location_picture,
      item_size: found.item_size,
      quantity: qty,
      unit: 'Nos',
      rate: rate,
      discount_percent: disc,
      gst_percent: gst,
      remarks: found.remark,
      amount: computeItemAmount(qty, rate, disc, gst),
    };

    setLineItems((prev) => [...prev, newItem]);
  };

  // 1-Click: Load all items in this project
  const handleLoadAllProjectItems = () => {
    if (availableItems.length === 0) return;
    const itemsToAdd: QuotationLineItem[] = availableItems.map((found, idx) => ({
      id: Date.now() + idx,
      item_id: found.id,
      description: found.item_name,
      reference_picture: found.reference_picture,
      work_location_picture: found.work_location_picture,
      item_size: found.item_size,
      quantity: 1,
      unit: 'Nos',
      rate: Number(found.default_rate) || 0,
      discount_percent: 0,
      gst_percent: 18,
      remarks: found.remark,
      amount: computeItemAmount(1, Number(found.default_rate) || 0, 0, 18),
    }));
    setLineItems(itemsToAdd);
  };

  const handleAddCustomItem = () => {
    const nextId = Math.max(0, ...lineItems.map((i) => i.id)) + 1;
    const newItem: QuotationLineItem = {
      id: nextId,
      description: 'Custom Fabrication / Work Package',
      quantity: 1,
      unit: 'Lot',
      rate: 10000,
      discount_percent: 0,
      gst_percent: 18,
      amount: 11800,
      item_size: 'Standard',
      remarks: 'As per approved architect drawings',
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  const handleRemoveLineItem = (id: number) => {
    setLineItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Grand totals computation
  const subtotal = lineItems.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.rate) || 0), 0);
  const totalDiscount = lineItems.reduce((acc, it) => {
    const base = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
    return acc + base * ((Number(it.discount_percent) || 0) / 100);
  }, 0);
  const totalGst = lineItems.reduce((acc, it) => {
    const base = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
    const discounted = base * (1 - (Number(it.discount_percent) || 0) / 100);
    return acc + discounted * ((Number(it.gst_percent) || 0) / 100);
  }, 0);
  const grandTotal = Math.round(subtotal - totalDiscount + totalGst);

  // Client Selection Handler
  const handleClientChange = (cId: number) => {
    setClientId(cId);
    const c = clients.find((item) => item.id === cId);
    if (c) {
      setClientName(c.client_name);
      setContactPerson(c.contact_person);
      setPhone(c.phone);
      setEmail(c.email);
      setAddress(c.address);
      setGstin(c.gstin || '');
    }

    // Auto-select first project for this client
    const matching = projects.filter((p) => p.client_id === cId);
    if (matching.length > 0) {
      setProjectId(matching[0].id);
      setProjectName(matching[0].project_name);
    } else {
      setProjectId(null);
      setProjectName('');
    }
  };

  // Project Selection Handler
  const handleProjectChange = (pId: number) => {
    setProjectId(pId);
    const p = projects.find((it) => it.id === pId);
    if (p) setProjectName(p.project_name);
  };

  // Save Quotation Handler
  const handleSaveQuotation = () => {
    const qData: Omit<QuotationMaster, 'id'> = {
      quotation_number: quotationNumber,
      quotation_date: quotationDate,
      valid_until: validUntil,
      client_id: clientId,
      client_name: clientName,
      contact_person: contactPerson,
      phone: phone,
      email: email,
      address: address,
      gstin: gstin,
      project_id: projectId,
      project_name: projectName,
      field_visibility: fieldVisibility,
      items: lineItems,
      subtotal,
      total_discount: totalDiscount,
      total_gst: totalGst,
      grand_total: grandTotal,
      payment_terms: paymentTerms,
      bank_details: bankDetails,
      notes: notes,
      status: status,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };

    if (selectedQuotationId) {
      const existing = quotations.find((q) => q.id === selectedQuotationId);
      if (existing) {
        updateQuotation({ ...qData, id: selectedQuotationId });
      } else {
        const created = addQuotation(qData);
        setSelectedQuotationId(created.id);
      }
    } else {
      const created = addQuotation(qData);
      setSelectedQuotationId(created.id);
    }

    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  // Load selected past quotation
  const handleLoadQuotation = (q: QuotationMaster) => {
    setSelectedQuotationId(q.id);
    setQuotationNumber(q.quotation_number);
    setQuotationDate(q.quotation_date);
    setValidUntil(q.valid_until);
    setClientId(q.client_id || null);
    setClientName(q.client_name);
    setContactPerson(q.contact_person);
    setPhone(q.phone);
    setEmail(q.email);
    setAddress(q.address);
    setGstin(q.gstin || '');
    setProjectId(q.project_id || null);
    setProjectName(q.project_name);
    if (q.field_visibility) setFieldVisibility(q.field_visibility);
    if (q.items) setLineItems(q.items);
    setPaymentTerms(q.payment_terms || '');
    setBankDetails(q.bank_details || '');
    setNotes(q.notes || '');
    setStatus(q.status);
  };

  // Field display toggle options
  const fieldOptions: { key: keyof QuotationFieldVisibility; label: string; desc: string }[] = [
    { key: 'showSerialNo', label: 'Serial No (#)', desc: 'Index number for items' },
    { key: 'showItemName', label: 'Item Description', desc: 'Detailed specifications' },
    { key: 'showReferencePic', label: 'Reference Photo', desc: 'Design mockup preview' },
    { key: 'showWorkLocationPic', label: 'Site Location Photo', desc: 'Façade or installation spot' },
    { key: 'showItemSize', label: 'Item Dimensions', desc: 'Physical size & measurements' },
    { key: 'showQuantity', label: 'Quantity', desc: 'Number of units' },
    { key: 'showUnit', label: 'Unit', desc: 'Sets, Nos, Metres, etc.' },
    { key: 'showRate', label: 'Unit Rate (₹)', desc: 'Price per unit' },
    { key: 'showDiscount', label: 'Discount %', desc: 'Discount percentage' },
    { key: 'showGst', label: 'GST %', desc: 'Applicable GST percentage' },
    { key: 'showRemarks', label: 'Item Remarks', desc: 'Warranty & site instructions' },
    { key: 'showLineTotal', label: 'Line Item Total (₹)', desc: 'Calculated item final cost' },
  ];

  const toggleField = (key: keyof QuotationFieldVisibility) => {
    setFieldVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExportQuotationCSV = () => {
    const csv = exportMasterToCSV(
      `Quotation_${quotationNumber}`,
      lineItems.map((li, idx) => ({
        Sl_No: idx + 1,
        Description: li.description,
        Size: li.item_size || '',
        Quantity: li.quantity,
        Unit: li.unit,
        Rate_INR: li.rate,
        Discount_Percent: li.discount_percent,
        GST_Percent: li.gst_percent,
        Total_Amount_INR: li.amount,
        Remarks: li.remarks || '',
      }))
    );
    downloadFile(csv, `Quotation_${quotationNumber}.csv`);
  };

  const generatePrintableHTML = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quotation_${quotationNumber}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #111; background: #fff; margin: 0; padding: 24px; font-size: 12px; line-height: 1.45; }
    .header { border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header-sub { font-size: 10px; font-family: monospace; letter-spacing: 1px; color: #666; font-weight: 600; text-transform: uppercase; }
    .title { font-size: 26px; font-weight: bold; margin: 2px 0; color: #111; font-family: Georgia, serif; }
    .meta-tag { display: inline-block; padding: 4px 8px; font-family: monospace; font-size: 11px; font-weight: 600; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; }
    .meta-list { font-size: 11px; font-family: monospace; color: #444; margin-top: 6px; line-height: 1.4; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-size: 11.5px; }
    .section-label { font-size: 9.5px; font-family: monospace; font-weight: bold; color: #777; text-transform: uppercase; letter-spacing: 0.5px; }
    .section-title { font-size: 14px; font-weight: bold; margin-top: 2px; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11px; }
    th { border-bottom: 2px solid #111; padding: 8px 6px; text-align: left; font-family: monospace; font-size: 10px; text-transform: uppercase; color: #444; }
    td { border-bottom: 1px solid #eee; padding: 8px 6px; vertical-align: middle; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: monospace; }
    .thumb { width: 44px; height: 44px; object-fit: cover; border-radius: 3px; border: 1px solid #ccc; }
    .totals-container { display: flex; justify-content: flex-end; margin-top: 14px; }
    .totals-box { width: 280px; font-size: 11.5px; }
    .totals-row { display: flex; justify-content: space-between; padding: 3px 0; color: #444; }
    .grand-total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; font-weight: bold; color: #111; border-top: 2px solid #111; border-bottom: 2px solid #111; margin-top: 4px; }
    .words-box { margin-top: 12px; background: #f8f8f8; border: 1px solid #eaeaea; border-radius: 4px; padding: 8px 12px; font-family: monospace; font-size: 11px; color: #333; }
    .terms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e0e0e0; font-size: 11px; line-height: 1.5; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 45px; padding-top: 16px; border-top: 1px solid #ccc; font-size: 11px; }
    .sig-line { width: 180px; border-bottom: 1px solid #888; margin-bottom: 6px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="header-sub">COMMERCIAL ESTIMATE & QUOTATION</div>
      <div class="title">Project Code Tracker</div>
      <div style="font-size: 11px; color: #555; max-width: 360px;">Engineering, Architectural Fabrications, Procurement & Project Management</div>
    </div>
    <div style="text-align: right;">
      <div class="meta-tag">${quotationNumber}</div>
      <div class="meta-list">
        <div>Date: ${quotationDate}</div>
        <div>Valid Until: ${validUntil}</div>
        <div>Status: <strong>${status}</strong></div>
      </div>
    </div>
  </div>

  <div class="grid-2">
    <div>
      <div class="section-label">QUOTATION FOR (BILL TO)</div>
      <div class="section-title">${clientName || 'Valued Client'}</div>
      <div>${contactPerson} · ${phone}</div>
      <div>${email}</div>
      <div style="color: #555; margin-top: 4px;">${address}</div>
      ${gstin ? `<div class="font-mono" style="margin-top: 4px;"><strong>GSTIN:</strong> ${gstin}</div>` : ''}
    </div>
    <div>
      <div class="section-label">PROJECT REFERENCE</div>
      <div class="section-title">${projectName || 'General Work Scope'}</div>
      <div style="margin-top: 4px;">Prepared by: <strong>${currentUser.full_name}</strong></div>
      <div>Contact: <strong>${currentUser.phone || currentUser.email}</strong></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        ${fieldVisibility.showSerialNo ? '<th>#</th>' : ''}
        ${fieldVisibility.showReferencePic ? '<th>Ref Photo</th>' : ''}
        ${fieldVisibility.showWorkLocationPic ? '<th>Site Photo</th>' : ''}
        ${fieldVisibility.showItemName ? '<th>Item Description</th>' : ''}
        ${fieldVisibility.showItemSize ? '<th>Dimensions</th>' : ''}
        ${fieldVisibility.showQuantity ? '<th class="text-center">Qty</th>' : ''}
        ${fieldVisibility.showUnit ? '<th>Unit</th>' : ''}
        ${fieldVisibility.showRate ? '<th class="text-right">Rate (₹)</th>' : ''}
        ${fieldVisibility.showDiscount ? '<th class="text-center">Disc</th>' : ''}
        ${fieldVisibility.showGst ? '<th class="text-center">GST</th>' : ''}
        ${fieldVisibility.showRemarks ? '<th>Remarks</th>' : ''}
        ${fieldVisibility.showLineTotal ? '<th class="text-right">Amount (₹)</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${lineItems.map((item, idx) => `
        <tr>
          ${fieldVisibility.showSerialNo ? `<td class="font-mono text-center" style="color: #666;">${idx + 1}</td>` : ''}
          ${fieldVisibility.showReferencePic ? `<td>${item.reference_picture ? `<img src="${item.reference_picture}" class="thumb" />` : '—'}</td>` : ''}
          ${fieldVisibility.showWorkLocationPic ? `<td>${item.work_location_picture ? `<img src="${item.work_location_picture}" class="thumb" />` : '—'}</td>` : ''}
          ${fieldVisibility.showItemName ? `<td style="font-weight: 600;">${item.description}</td>` : ''}
          ${fieldVisibility.showItemSize ? `<td class="font-mono">${item.item_size || '—'}</td>` : ''}
          ${fieldVisibility.showQuantity ? `<td class="font-mono text-center" style="font-weight: 600;">${item.quantity}</td>` : ''}
          ${fieldVisibility.showUnit ? `<td class="font-mono">${item.unit || 'Nos'}</td>` : ''}
          ${fieldVisibility.showRate ? `<td class="font-mono text-right">₹ ${item.rate.toLocaleString('en-IN')}</td>` : ''}
          ${fieldVisibility.showDiscount ? `<td class="font-mono text-center">${item.discount_percent > 0 ? `${item.discount_percent}%` : '—'}</td>` : ''}
          ${fieldVisibility.showGst ? `<td class="font-mono text-center">${item.gst_percent}%</td>` : ''}
          ${fieldVisibility.showRemarks ? `<td style="font-style: italic; color: #666; font-size: 10px;">${item.remarks || '—'}</td>` : ''}
          ${fieldVisibility.showLineTotal ? `<td class="font-mono text-right" style="font-weight: bold;">₹ ${item.amount.toLocaleString('en-IN')}</td>` : ''}
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals-container">
    <div class="totals-box">
      <div class="totals-row">
        <span>Subtotal:</span>
        <span class="font-mono">₹ ${subtotal.toLocaleString('en-IN')}</span>
      </div>
      ${totalDiscount > 0 ? `
        <div class="totals-row" style="color: #c00;">
          <span>Total Discount:</span>
          <span class="font-mono">- ₹ ${Math.round(totalDiscount).toLocaleString('en-IN')}</span>
        </div>
      ` : ''}
      <div class="totals-row">
        <span>Total GST:</span>
        <span class="font-mono">+ ₹ ${Math.round(totalGst).toLocaleString('en-IN')}</span>
      </div>
      <div class="grand-total-row">
        <span>Grand Total:</span>
        <span class="font-mono">₹ ${grandTotal.toLocaleString('en-IN')}</span>
      </div>
    </div>
  </div>

  <div class="words-box">
    <strong>Amount in Words: </strong>${numberToIndianWords(grandTotal)}
  </div>

  <div class="terms-grid">
    <div>
      <div class="section-label">PAYMENT TERMS & SCHEDULE</div>
      <div style="white-space: pre-line; color: #333; margin-top: 3px;">${paymentTerms || 'Standard advance & milestone terms apply.'}</div>

      <div class="section-label" style="margin-top: 12px;">BANK TRANSFER DETAILS</div>
      <div class="font-mono" style="background: #f4f4f4; padding: 6px 8px; border-radius: 3px; font-size: 10.5px; margin-top: 3px;">${bankDetails || 'Available on work order invoice'}</div>
    </div>
    <div>
      <div class="section-label">TERMS & CONDITIONS</div>
      <div style="white-space: pre-line; color: #333; margin-top: 3px;">${notes || 'Standard warranty and site guidelines apply.'}</div>
    </div>
  </div>

  <div class="signatures">
    <div>
      <div class="sig-line"></div>
      <strong>Authorized Signatory</strong>
      <div style="color: #666; font-size: 10px;">Project Code Tracker Engineering</div>
    </div>
    <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
      <div class="sig-line"></div>
      <strong>Client Acceptance & Work Order</strong>
      <div style="color: #666; font-size: 10px;">Signature & Official Stamp</div>
    </div>
  </div>
</body>
</html>`;
  };

  const handlePrint = () => {
    setActiveMode('preview');
    const html = generatePrintableHTML();

    try {
      const existing = document.getElementById('quotation-print-frame');
      if (existing) existing.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'quotation-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.print();
          }
        }, 300);
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  const handleOpenPrintWindow = () => {
    const html = generatePrintableHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      downloadFile(html, `Quotation_${quotationNumber}.html`);
    }
  };

  const activeProjectObj = projects.find((p) => p.id === projectId);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-soft)] no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-[var(--accent)] uppercase tracking-wider">
              Sales & Commercial
            </span>
            <span className="text-xs text-[var(--text-faint)]">·</span>
            <span className="text-xs text-[var(--text-faint)] font-mono">Quotation Generator</span>
          </div>
          <h2 className="font-display text-2xl font-normal text-[var(--text)]">
            Generate Client Quotation
          </h2>
          <p className="text-xs text-[var(--text-dim)] mt-0.5">
            Select client to view associated projects, then choose project-scoped items.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center border border-[var(--border)] rounded overflow-hidden bg-[var(--surface)] p-0.5">
            <button
              onClick={() => setActiveMode('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-colors cursor-pointer ${
                activeMode === 'editor'
                  ? 'bg-[var(--accent)] text-[#1E1B18] font-semibold'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setActiveMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-colors cursor-pointer ${
                activeMode === 'preview'
                  ? 'bg-[var(--accent)] text-[#1E1B18] font-semibold'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Client Preview</span>
            </button>
          </div>

          {/* Field Selector Toggle Button */}
          <button
            onClick={() => setIsFieldConfigOpen(!isFieldConfigOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border transition-colors cursor-pointer ${
              isFieldConfigOpen
                ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent)]'
                : 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:border-[var(--accent)]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Select Display Fields</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isFieldConfigOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportQuotationCSV}
            title="Export Quotation Line Items to CSV"
            className="p-2 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Print / PDF Export */}
          <button
            onClick={handlePrint}
            title="Print quotation or save as PDF"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSaveQuotation}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Quotation</span>
          </button>
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-700 dark:text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Quotation {quotationNumber} saved successfully to Quotation Master!</span>
        </div>
      )}

      {/* Field Selector Dropdown Modal */}
      {isFieldConfigOpen && (
        <div className="p-5 bg-[var(--surface)] rounded-lg border border-[var(--border)] shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-soft)]">
            <div>
              <h3 className="font-display text-sm font-semibold text-[var(--text)]">
                Quotation Column Display Settings
              </h3>
              <p className="text-xs text-[var(--text-dim)]">
                Choose which item parameters appear on the client-facing quotation and printout.
              </p>
            </div>
            <button
              onClick={() => setIsFieldConfigOpen(false)}
              className="px-2.5 py-1 text-xs font-mono rounded bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] cursor-pointer"
            >
              Done
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {fieldOptions.map((f) => {
              const isChecked = fieldVisibility[f.key];
              return (
                <div
                  key={f.key}
                  onClick={() => toggleField(f.key)}
                  className={`p-2.5 rounded border cursor-pointer select-none transition-all flex items-start gap-2.5 ${
                    isChecked
                      ? 'bg-[var(--surface-2)] border-[var(--accent)] text-[var(--text)]'
                      : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-soft)]'
                  }`}
                >
                  <div className="pt-0.5 text-[var(--accent)]">
                    {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-[var(--text-faint)]" />}
                  </div>
                  <div>
                    <span className="block text-xs font-medium">{f.label}</span>
                    <span className="block text-[10.5px] text-[var(--text-faint)] font-mono leading-tight mt-0.5">
                      {f.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EDITOR MODE */}
      {activeMode === 'editor' && (
        <div className="space-y-6">
          {/* STEP 1: Cascading Client & Project Selector */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[var(--border-soft)] gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[var(--accent)] text-[#1E1B18] font-mono font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h3 className="font-display text-base font-medium text-[var(--text)]">
                  Client & Project Association
                </h3>
              </div>

              {quotations.length > 0 && (
                <select
                  value={selectedQuotationId || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const found = quotations.find((q) => q.id === id);
                    if (found) handleLoadQuotation(found);
                  }}
                  className="text-xs bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded px-2.5 py-1.5 font-mono outline-none"
                >
                  <option value="">Load Past Quotation...</option>
                  {quotations.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quotation_number} - {q.client_name} (₹{q.grand_total.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Client Selection */}
              <div className="p-4 rounded-md bg-[var(--bg)] border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-semibold text-[var(--text)] flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-[var(--accent)]" />
                    <span>Select Client *</span>
                  </label>
                  <span className="text-[11px] font-mono text-[var(--accent)]">
                    {clients.length} Clients
                  </span>
                </div>

                <select
                  value={clientId || ''}
                  onChange={(e) => handleClientChange(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-medium focus:border-[var(--accent)] outline-none"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.client_name} ({c.contact_person})
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-dim)] pt-1">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-[var(--text-faint)] block">Contact Person</span>
                    <span className="text-[var(--text)] font-medium truncate block">{contactPerson || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-[var(--text-faint)] block">Phone</span>
                    <span className="text-[var(--text)] font-medium truncate block">{phone || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-mono text-[var(--text-faint)] block">Email</span>
                    <span className="text-[var(--text)] truncate block">{email || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Project Selection (Filtered strictly by selected Client) */}
              <div className="p-4 rounded-md bg-[var(--bg)] border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-semibold text-[var(--text)] flex items-center gap-1.5">
                    <FolderKanban className="w-4 h-4 text-[var(--accent)]" />
                    <span>Select Project in this Client *</span>
                  </label>
                  <span className="text-[11px] font-mono text-[var(--accent)]">
                    {availableProjects.length} Project{availableProjects.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {availableProjects.length === 0 ? (
                  <div className="p-3 bg-[var(--surface-2)]/50 rounded border border-dashed border-[var(--border)] text-xs text-[var(--text-dim)] text-center">
                    No projects found under {clientName || 'this client'}.
                  </div>
                ) : (
                  <select
                    value={projectId || ''}
                    onChange={(e) => handleProjectChange(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-medium focus:border-[var(--accent)] outline-none"
                  >
                    {availableProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_name} (Budget: ₹{p.approved_budget.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                )}

                {activeProjectObj ? (
                  <div className="space-y-1.5 pt-1 text-xs text-[var(--text-dim)]">
                    <div className="flex justify-between">
                      <span className="text-[10px] uppercase font-mono text-[var(--text-faint)]">Status:</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)]">
                        {activeProjectObj.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] uppercase font-mono text-[var(--text-faint)]">Approved Budget:</span>
                      <span className="font-mono text-xs text-[var(--text)] font-medium">
                        ₹ {activeProjectObj.approved_budget.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-faint)] line-clamp-2 pt-1 border-t border-[var(--border-soft)]">
                      {activeProjectObj.description}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-faint)]">Please select a project to proceed.</p>
                )}
              </div>
            </div>

            {/* Quotation Meta Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[var(--border-soft)]">
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Quotation No. *</label>
                <input
                  type="text"
                  value={quotationNumber}
                  onChange={(e) => setQuotationNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Date</label>
                <input
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Valid Until</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono"
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent to Client</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* STEP 2: Items in Selected Project */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[var(--border-soft)] gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--accent)] text-[#1E1B18] font-mono font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h3 className="font-display text-base font-medium text-[var(--text)]">
                    Items in Selected Project
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border)]">
                    {availableItems.length} Available in {projectName || 'Project'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-dim)] mt-0.5 ml-8">
                  Showing only the items associated with this specific project scope.
                </p>
              </div>

              {/* Add item actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1-Click Load All Project Items */}
                {availableItems.length > 0 && (
                  <button
                    onClick={handleLoadAllProjectItems}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] border border-[var(--border)] transition-colors cursor-pointer"
                    title="Populate all items tagged to this project into quotation"
                  >
                    <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Add All Project Items ({availableItems.length})</span>
                  </button>
                )}

                {/* Add Specific Item in Project */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddProjectItem(Number(e.target.value));
                      e.target.value = '';
                    }
                  }}
                  className="px-3 py-1.5 text-xs bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded outline-none font-mono cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>
                    + Add Item from Project ({availableItems.length})...
                  </option>
                  {availableItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.item_name} (₹{it.default_rate.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>

                {/* Custom Work Item */}
                <button
                  onClick={handleAddCustomItem}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono rounded bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-[var(--accent)]" />
                  <span>Custom Item</span>
                </button>
              </div>
            </div>

            {/* Line Items Table */}
            {lineItems.length === 0 ? (
              <div className="py-10 text-center text-xs text-[var(--text-dim)] border border-dashed border-[var(--border)] rounded-md">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-[var(--accent)]" />
                <p className="font-medium text-[var(--text)]">No items added to this quotation yet.</p>
                <p className="text-[11px] text-[var(--text-faint)] mt-1">
                  Choose from the "{availableItems.length} items in Project" dropdown above or click "Add All Project Items".
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-faint)] font-mono text-[11px] uppercase tracking-wider">
                      {fieldVisibility.showSerialNo && <th className="py-2.5 px-3 w-12">#</th>}
                      {fieldVisibility.showReferencePic && <th className="py-2.5 px-3 w-14">Ref Pic</th>}
                      {fieldVisibility.showWorkLocationPic && <th className="py-2.5 px-3 w-14">Site Pic</th>}
                      {fieldVisibility.showItemName && <th className="py-2.5 px-3 min-w-[220px]">Item Description</th>}
                      {fieldVisibility.showItemSize && <th className="py-2.5 px-3 w-28">Dimensions</th>}
                      {fieldVisibility.showQuantity && <th className="py-2.5 px-3 w-20">Qty</th>}
                      {fieldVisibility.showUnit && <th className="py-2.5 px-3 w-20">Unit</th>}
                      {fieldVisibility.showRate && <th className="py-2.5 px-3 w-28">Rate (₹)</th>}
                      {fieldVisibility.showDiscount && <th className="py-2.5 px-3 w-20">Disc %</th>}
                      {fieldVisibility.showGst && <th className="py-2.5 px-3 w-20">GST %</th>}
                      {fieldVisibility.showRemarks && <th className="py-2.5 px-3 min-w-[140px]">Remarks</th>}
                      {fieldVisibility.showLineTotal && <th className="py-2.5 px-3 w-28 text-right">Total (₹)</th>}
                      <th className="py-2.5 px-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {lineItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                        {fieldVisibility.showSerialNo && (
                          <td className="py-2.5 px-3 font-mono text-[var(--text-faint)]">{idx + 1}</td>
                        )}

                        {fieldVisibility.showReferencePic && (
                          <td className="py-2.5 px-3">
                            {item.reference_picture ? (
                              <img
                                src={item.reference_picture}
                                alt="Ref"
                                className="w-10 h-10 object-cover rounded border border-[var(--border)]"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded border border-dashed border-[var(--border)] flex items-center justify-center text-[var(--text-faint)]">
                                <ImageIcon className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </td>
                        )}

                        {fieldVisibility.showWorkLocationPic && (
                          <td className="py-2.5 px-3">
                            {item.work_location_picture ? (
                              <img
                                src={item.work_location_picture}
                                alt="Location"
                                className="w-10 h-10 object-cover rounded border border-[var(--border)]"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded border border-dashed border-[var(--border)] flex items-center justify-center text-[var(--text-faint)]">
                                <ImageIcon className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </td>
                        )}

                        {fieldVisibility.showItemName && (
                          <td className="py-2.5 px-3">
                            <textarea
                              rows={2}
                              value={item.description}
                              onChange={(e) => handleUpdateLineItem(idx, 'description', e.target.value)}
                              className="w-full px-2 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] resize-y focus:outline-none focus:border-[var(--accent)]"
                            />
                          </td>
                        )}

                        {fieldVisibility.showItemSize && (
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={item.item_size || ''}
                              onChange={(e) => handleUpdateLineItem(idx, 'item_size', e.target.value)}
                              placeholder="Size..."
                              className="w-full px-2 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono"
                            />
                          </td>
                        )}

                        {fieldVisibility.showQuantity && (
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateLineItem(idx, 'quantity', e.target.value)}
                              className="w-full px-2 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono text-center"
                            />
                          </td>
                        )}

                        {fieldVisibility.showUnit && (
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={item.unit || 'Nos'}
                              onChange={(e) => handleUpdateLineItem(idx, 'unit', e.target.value)}
                              className="w-full px-2 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] text-center font-mono"
                            />
                          </td>
                        )}

                        {fieldVisibility.showRate && (
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="0"
                              value={item.rate}
                              onChange={(e) => handleUpdateLineItem(idx, 'rate', e.target.value)}
                              className="w-full px-2 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono text-right"
                            />
                          </td>
                        )}

                        {fieldVisibility.showDiscount && (
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount_percent}
                              onChange={(e) => handleUpdateLineItem(idx, 'discount_percent', e.target.value)}
                              className="w-full px-2 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono text-center"
                            />
                          </td>
                        )}

                        {fieldVisibility.showGst && (
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="0"
                              max="28"
                              value={item.gst_percent}
                              onChange={(e) => handleUpdateLineItem(idx, 'gst_percent', e.target.value)}
                              className="w-full px-2 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono text-center"
                            />
                          </td>
                        )}

                        {fieldVisibility.showRemarks && (
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={item.remarks || ''}
                              onChange={(e) => handleUpdateLineItem(idx, 'remarks', e.target.value)}
                              placeholder="Notes..."
                              className="w-full px-2 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)]"
                            />
                          </td>
                        )}

                        {fieldVisibility.showLineTotal && (
                          <td className="py-2.5 px-3 text-right font-mono text-[var(--accent)] font-medium">
                            ₹ {item.amount.toLocaleString('en-IN')}
                          </td>
                        )}

                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleRemoveLineItem(item.id)}
                            className="p-1 text-[var(--text-faint)] hover:text-red-500 rounded transition-colors cursor-pointer"
                            title="Remove Line Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* STEP 3: Summary Totals & Commercial Terms */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 space-y-4">
              <h3 className="font-display text-sm font-semibold text-[var(--text)] pb-2 border-b border-[var(--border-soft)]">
                Terms, Conditions & Payment Guidelines
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Payment Schedule</label>
                  <textarea
                    rows={2}
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Company Bank Details</label>
                  <input
                    type="text"
                    value={bankDetails}
                    onChange={(e) => setBankDetails(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">Standard Terms & Caveats</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)]"
                  />
                </div>
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-display text-sm font-semibold text-[var(--text)] pb-2 border-b border-[var(--border-soft)]">
                  Estimate Financial Overview
                </h3>

                <div className="space-y-2.5 pt-3 text-xs">
                  <div className="flex justify-between text-[var(--text-dim)]">
                    <span>Base Subtotal:</span>
                    <span className="font-mono text-[var(--text)]">₹ {subtotal.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-[var(--text-dim)]">
                    <span>Applicable Discounts:</span>
                    <span className="font-mono text-red-500">- ₹ {Math.round(totalDiscount).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-[var(--text-dim)]">
                    <span>Estimated GST:</span>
                    <span className="font-mono text-[var(--text)]">+ ₹ {Math.round(totalGst).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="pt-3 border-t border-[var(--border)] flex justify-between items-baseline">
                    <span className="font-display font-medium text-base text-[var(--text)]">
                      Grand Total:
                    </span>
                    <span className="font-mono font-bold text-lg text-[var(--accent)]">
                      ₹ {grandTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[var(--border-soft)]">
                <p className="text-[10px] uppercase font-mono text-[var(--text-faint)]">In Words:</p>
                <p className="text-xs font-mono text-[var(--text-dim)] mt-0.5 leading-relaxed">
                  {numberToIndianWords(grandTotal)}
                </p>
                <button
                  onClick={() => setActiveMode('preview')}
                  className="w-full mt-4 py-2 px-3 rounded bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] border border-[var(--border)] text-xs font-mono transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Preview Formatted Quotation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT PREVIEW / PRINTABLE VIEW */}
      {activeMode === 'preview' && (
        <div className="space-y-4">
          {/* Quick Print Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg max-w-4xl mx-auto no-print">
            <div className="flex items-center gap-2 text-xs text-[var(--text)]">
              <span className="font-mono text-[var(--accent)] font-semibold">PREVIEW READY:</span>
              <span className="text-[var(--text-dim)]">Quotation {quotationNumber}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveMode('editor')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Return to Editor</span>
              </button>

              <button
                onClick={handleOpenPrintWindow}
                title="Open clean printable document in new window"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Open in Clean Window</span>
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>

          <div id="printable-quotation" className="bg-white text-neutral-900 border border-neutral-300 rounded-lg p-8 sm:p-12 max-w-4xl mx-auto shadow-2xl quotation-sheet font-sans">
          {/* Document Header */}
          <div className="flex justify-between items-start pb-6 border-b-2 border-neutral-800">
            <div>
              <span className="text-[11px] font-mono tracking-widest uppercase text-neutral-500 font-semibold">
                COMMERCIAL ESTIMATE & QUOTATION
              </span>
              <h1 className="font-display text-3xl font-bold tracking-tight text-neutral-900 mt-1">
                Project Code Tracker
              </h1>
              <p className="text-xs text-neutral-600 mt-1 max-w-sm">
                Engineering, Architectural Fabrications, Procurement & Project Management
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 text-xs font-mono font-semibold bg-neutral-100 border border-neutral-300 rounded text-neutral-800">
                {quotationNumber}
              </span>
              <div className="text-xs font-mono text-neutral-600 mt-2 space-y-0.5">
                <p>Date: {quotationDate}</p>
                <p>Valid Until: {validUntil}</p>
                <p>Status: <span className="font-semibold text-neutral-900">{status}</span></p>
              </div>
            </div>
          </div>

          {/* Client & Project Details */}
          <div className="grid grid-cols-2 gap-8 py-6 border-b border-neutral-200 text-xs">
            <div>
              <span className="font-mono text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                QUOTATION FOR (BILL TO)
              </span>
              <h4 className="font-bold text-base text-neutral-900 mt-1">{clientName || 'Valued Client'}</h4>
              <p className="text-neutral-700 mt-0.5">{contactPerson} · {phone}</p>
              <p className="text-neutral-700">{email}</p>
              <p className="text-neutral-600 mt-1 leading-relaxed">{address}</p>
              {gstin && <p className="font-mono text-neutral-800 mt-1 font-medium">GSTIN: {gstin}</p>}
            </div>

            <div>
              <span className="font-mono text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                PROJECT REFERENCE
              </span>
              <h4 className="font-bold text-base text-neutral-900 mt-1">{projectName || 'General Work Scope'}</h4>
              <p className="text-neutral-600 mt-1">
                Prepared by: <span className="font-medium text-neutral-900">{currentUser.full_name}</span>
              </p>
              <p className="text-neutral-600">
                Contact: <span className="font-medium text-neutral-900">{currentUser.phone || currentUser.email}</span>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-800 text-neutral-700 font-mono text-[11px] uppercase">
                  {fieldVisibility.showSerialNo && <th className="py-2 px-2">#</th>}
                  {fieldVisibility.showReferencePic && <th className="py-2 px-2">Ref Photo</th>}
                  {fieldVisibility.showWorkLocationPic && <th className="py-2 px-2">Site Photo</th>}
                  {fieldVisibility.showItemName && <th className="py-2 px-2">Item Description</th>}
                  {fieldVisibility.showItemSize && <th className="py-2 px-2">Dimensions</th>}
                  {fieldVisibility.showQuantity && <th className="py-2 px-2 text-center">Qty</th>}
                  {fieldVisibility.showUnit && <th className="py-2 px-2">Unit</th>}
                  {fieldVisibility.showRate && <th className="py-2 px-2 text-right">Rate (₹)</th>}
                  {fieldVisibility.showDiscount && <th className="py-2 px-2 text-center">Disc</th>}
                  {fieldVisibility.showGst && <th className="py-2 px-2 text-center">GST</th>}
                  {fieldVisibility.showRemarks && <th className="py-2 px-2">Remarks</th>}
                  {fieldVisibility.showLineTotal && <th className="py-2 px-2 text-right">Amount (₹)</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {lineItems.map((item, idx) => (
                  <tr key={item.id}>
                    {fieldVisibility.showSerialNo && (
                      <td className="py-3 px-2 font-mono text-neutral-500">{idx + 1}</td>
                    )}
                    {fieldVisibility.showReferencePic && (
                      <td className="py-3 px-2">
                        {item.reference_picture && (
                          <img
                            src={item.reference_picture}
                            alt="Ref"
                            className="w-12 h-12 object-cover rounded border border-neutral-300"
                          />
                        )}
                      </td>
                    )}
                    {fieldVisibility.showWorkLocationPic && (
                      <td className="py-3 px-2">
                        {item.work_location_picture && (
                          <img
                            src={item.work_location_picture}
                            alt="Site"
                            className="w-12 h-12 object-cover rounded border border-neutral-300"
                          />
                        )}
                      </td>
                    )}
                    {fieldVisibility.showItemName && (
                      <td className="py-3 px-2 font-medium text-neutral-900 leading-snug">
                        {item.description}
                      </td>
                    )}
                    {fieldVisibility.showItemSize && (
                      <td className="py-3 px-2 font-mono text-neutral-700">{item.item_size || '—'}</td>
                    )}
                    {fieldVisibility.showQuantity && (
                      <td className="py-3 px-2 font-mono text-center font-medium text-neutral-900">
                        {item.quantity}
                      </td>
                    )}
                    {fieldVisibility.showUnit && (
                      <td className="py-3 px-2 font-mono text-neutral-600">{item.unit || 'Nos'}</td>
                    )}
                    {fieldVisibility.showRate && (
                      <td className="py-3 px-2 font-mono text-right text-neutral-800">
                        ₹ {item.rate.toLocaleString('en-IN')}
                      </td>
                    )}
                    {fieldVisibility.showDiscount && (
                      <td className="py-3 px-2 font-mono text-center text-neutral-600">
                        {item.discount_percent > 0 ? `${item.discount_percent}%` : '—'}
                      </td>
                    )}
                    {fieldVisibility.showGst && (
                      <td className="py-3 px-2 font-mono text-center text-neutral-600">
                        {item.gst_percent}%
                      </td>
                    )}
                    {fieldVisibility.showRemarks && (
                      <td className="py-3 px-2 text-neutral-500 text-[11px] italic">
                        {item.remarks || '—'}
                      </td>
                    )}
                    {fieldVisibility.showLineTotal && (
                      <td className="py-3 px-2 font-mono font-bold text-right text-neutral-900">
                        ₹ {item.amount.toLocaleString('en-IN')}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Calculation */}
          <div className="flex justify-end pt-4 border-t-2 border-neutral-800">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-700">
                <span>Subtotal:</span>
                <span className="font-mono">₹ {subtotal.toLocaleString('en-IN')}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Total Discount:</span>
                  <span className="font-mono">- ₹ {Math.round(totalDiscount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-700">
                <span>Total GST:</span>
                <span className="font-mono">+ ₹ {Math.round(totalGst).toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-2 border-t border-neutral-300 flex justify-between font-bold text-base text-neutral-900">
                <span>Grand Total:</span>
                <span className="font-mono">₹ {grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="mt-4 p-3 bg-neutral-100 rounded text-xs font-mono text-neutral-800">
            <span className="font-bold">Amount in Words: </span>
            {numberToIndianWords(grandTotal)}
          </div>

          {/* Commercial Terms & Bank Info */}
          <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-neutral-200 text-xs">
            <div>
              <h5 className="font-bold uppercase tracking-wider text-[10px] text-neutral-500 mb-1">
                PAYMENT TERMS & SCHEDULE
              </h5>
              <p className="text-neutral-700 leading-relaxed whitespace-pre-line">{paymentTerms}</p>

              <h5 className="font-bold uppercase tracking-wider text-[10px] text-neutral-500 mt-4 mb-1">
                BANK TRANSFER DETAILS
              </h5>
              <p className="font-mono text-neutral-800 bg-neutral-100 p-2 rounded text-[11px] leading-tight">
                {bankDetails}
              </p>
            </div>

            <div>
              <h5 className="font-bold uppercase tracking-wider text-[10px] text-neutral-500 mb-1">
                TERMS & CONDITIONS
              </h5>
              <p className="text-neutral-700 leading-relaxed whitespace-pre-line">{notes}</p>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-16 pt-8 border-t border-neutral-300 text-xs">
            <div>
              <div className="border-b border-neutral-400 w-48 mb-2" />
              <p className="font-bold text-neutral-800">Authorized Signatory</p>
              <p className="text-neutral-500 text-[11px]">Project Code Tracker Engineering</p>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="border-b border-neutral-400 w-48 mb-2" />
              <p className="font-bold text-neutral-800">Client Acceptance & Work Order</p>
              <p className="text-neutral-500 text-[11px]">Signature & Official Stamp</p>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
