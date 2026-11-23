import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Language, Payment, Student, AcademyClass, Deposit } from '../types';
import { formatCurrencyExact, summarizePaymentsByMethod } from '../calculations/paymentEngine';
import { translate } from '../translations/dictionary';

// Modern Beauty Atelier PDF Palette (Deep Olive, Muted Sage, Warm Clay, Porcelain, Charcoal)
const OLIVE: [number, number, number] = [66, 77, 64]; // #424D40
const SAGE: [number, number, number] = [135, 149, 135]; // #879587
const PORCELAIN: [number, number, number] = [247, 245, 240]; // #F7F5F0
const CHARCOAL: [number, number, number] = [41, 45, 41]; // #292D29
const SOFT_GRAY: [number, number, number] = [133, 135, 128]; // #858780
const CLAY: [number, number, number] = [189, 128, 107]; // #BD806B

function drawBrandHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  metaRight: string[]
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...OLIVE);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setFillColor(...CLAY);
  doc.rect(0, 34, pageWidth, 1.4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.text('LVB Pulse', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(232, 234, 227);
  doc.text('LA VOUTE BEAUTY ACADEMY LLC · CITY TERRACE, LOS ANGELES', 14, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 14, 29.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(232, 234, 227);
  metaRight.forEach((line, idx) => {
    doc.text(line, pageWidth - 14, 12 + idx * 5.2, { align: 'right' });
  });

  if (subtitle) {
    doc.setTextColor(...SOFT_GRAY);
    doc.setFontSize(9);
    doc.text(subtitle, 14, 42);
  }
}

function drawFooter(doc: jsPDF, language: Language) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerText =
    language === 'es'
      ? 'La Voute Beauty Academy LLC · LVB Pulse (Edición de Demostración)'
      : 'La Voute Beauty Academy LLC · LVB Pulse (Interactive Showcase Edition)';

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(221, 220, 212);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
    doc.setFontSize(8);
    doc.setTextColor(...SOFT_GRAY);
    doc.text(footerText, 14, pageHeight - 9);
    doc.text(`${i} / ${pageCount}`, pageWidth - 14, pageHeight - 9, {
      align: 'right',
    });
  }
}

export function generateReceiptPdf(params: {
  receiptNumber: string;
  student: Student;
  academyClass?: AcademyClass;
  date: string;
  amount: number;
  method: Payment['method'];
  collectorName: string;
  isConfirmed: boolean;
  categoryLabel: string;
  notes?: string;
  language: Language;
}) {
  const {
    receiptNumber,
    student,
    academyClass,
    date,
    amount,
    method,
    collectorName,
    isConfirmed,
    categoryLabel,
    notes,
    language,
  } = params;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const title =
    language === 'es'
      ? `Recibo Oficial ${receiptNumber}`
      : `Official Payment Receipt ${receiptNumber}`;

  const statusText = isConfirmed
    ? translate(language, 'confirmed').toUpperCase()
    : translate(language, 'pendingConfirmation').toUpperCase();

  drawBrandHeader(doc, title, '', [
    `${translate(language, 'receiptNumber')}: ${receiptNumber}`,
    `${translate(language, 'date')}: ${date}`,
    `${translate(language, 'status')}: ${statusText}`,
  ]);

  doc.setFillColor(...(isConfirmed ? ([234, 243, 238] as [number, number, number]) : ([251, 242, 227] as [number, number, number])));
  doc.roundedRect(14, 42, 182, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...(isConfirmed ? ([47, 111, 78] as [number, number, number]) : ([154, 99, 27] as [number, number, number])));
  const bannerLabel = isConfirmed
    ? language === 'es'
      ? 'PAGO CONFIRMADO — REGISTRADO EN EL LIBRO DE LA ACADEMIA'
      : 'CONFIRMED PAYMENT — RECORDED IN ACADEMY LEDGER'
    : language === 'es'
      ? 'DEPÓSITO PENDIENTE DE CONFIRMACIÓN POR PROPIETARIO'
      : 'AWAITING OWNER CONFIRMATION — NOT YET A CONFIRMED PAYMENT';
  doc.text(bannerLabel, 19, 49.5);

  autoTable(doc, {
    startY: 60,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: CHARCOAL,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, textColor: SOFT_GRAY },
      1: { cellWidth: 127 },
    },
    body: [
      [language === 'es' ? 'Alumna' : 'Student', student.fullName],
      [language === 'es' ? 'Teléfono / Correo' : 'Phone / Email', `${student.phone} · ${student.email}`],
      [language === 'es' ? 'Programa / Clase' : 'Program / Class', `${student.program}${academyClass ? ` — ${academyClass.name}` : ''}`],
      [language === 'es' ? 'Concepto' : 'Payment Category', categoryLabel],
      [translate(language, 'paymentMethod'), translate(language, `method_${method}` as never)],
      [translate(language, 'collector'), collectorName],
      [translate(language, 'date'), date],
      [translate(language, 'notes'), notes || '—'],
    ],
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  doc.setFillColor(...PORCELAIN);
  doc.setDrawColor(...SAGE);
  doc.roundedRect(14, finalY, 182, 24, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...SOFT_GRAY);
  doc.text(
    language === 'es' ? 'MONTO DEL RECIBO' : 'RECEIPT AMOUNT',
    20,
    finalY + 9
  );
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...CHARCOAL);
  doc.text(formatCurrencyExact(amount, language), 20, finalY + 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...SOFT_GRAY);
  doc.text(
    `${translate(language, 'status')}: ${statusText}`,
    190,
    finalY + 14,
    { align: 'right' }
  );

  drawFooter(doc, language);
  doc.save(`${receiptNumber}_${student.fullName.replace(/\s+/g, '_')}.pdf`);
}

export function generateDailyCashReportPdf(params: {
  collectorName: string;
  date: string;
  payments: Payment[];
  students: Student[];
  classes: AcademyClass[];
  language: Language;
}) {
  const { collectorName, date, payments, students, classes, language } = params;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const summary = summarizePaymentsByMethod(payments);
  const title =
    language === 'es' ? 'Corte de Caja Diario' : 'Daily Cash Collection Report';

  drawBrandHeader(
    doc,
    title,
    `${translate(language, 'collector')}: ${collectorName} · ${translate(language, 'date')}: ${date}`,
    [
      `${language === 'es' ? 'Generado' : 'Generated'}: ${new Date().toISOString().slice(0, 10)}`,
      `${language === 'es' ? 'Transacciones' : 'Transactions'}: ${summary.count}`,
    ]
  );

  const rows = payments.map((p) => {
    const stu = students.find((s) => s.id === p.studentId);
    const cls = classes.find((c) => c.id === p.classId);
    return [
      p.receiptNumber,
      stu?.fullName ?? p.studentId,
      cls?.name ?? p.classId,
      p.week === 0 ? translate(language, 'deposit') : `W${p.week}`,
      translate(language, `method_${p.method}` as never),
      formatCurrencyExact(p.amount, language),
    ];
  });

  autoTable(doc, {
    startY: 48,
    headStyles: { fillColor: OLIVE, textColor: [255, 255, 255], fontSize: 8.5 },
    alternateRowStyles: { fillColor: PORCELAIN },
    styles: { fontSize: 8.5, cellPadding: 3, textColor: CHARCOAL },
    head: [[
      translate(language, 'receiptNumber'),
      language === 'es' ? 'Alumna' : 'Student',
      language === 'es' ? 'Clase' : 'Class',
      language === 'es' ? 'Semana' : 'Week',
      translate(language, 'paymentMethod'),
      translate(language, 'amount'),
    ]],
    body: rows.length > 0 ? rows : [['—', language === 'es' ? 'Sin pagos registrados' : 'No payments recorded', '—', '—', '—', '$0.00']],
  });

  const afterTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  doc.setFillColor(...PORCELAIN);
  doc.setDrawColor(221, 220, 212);
  doc.roundedRect(14, afterTableY, 182, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...CHARCOAL);
  doc.text(
    language === 'es' ? 'Resumen por Método de Pago' : 'Totals by Payment Method',
    20,
    afterTableY + 8
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${translate(language, 'method_cash')}: ${formatCurrencyExact(summary.cashTotal, language)}`, 20, afterTableY + 16);
  doc.text(`${translate(language, 'method_card')}: ${formatCurrencyExact(summary.cardTotal, language)}`, 20, afterTableY + 23);
  doc.text(`Zelle / Venmo / Cash App: ${formatCurrencyExact(summary.digitalTotal, language)}`, 20, afterTableY + 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...OLIVE);
  doc.text(
    `${language === 'es' ? 'EFECTIVO A ENTREGAR' : 'TOTAL CASH TO HAND IN'}: ${formatCurrencyExact(summary.cashTotal, language)}`,
    190,
    afterTableY + 17,
    { align: 'right' }
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...SOFT_GRAY);
  doc.text(
    `${language === 'es' ? 'Total General Recaudado' : 'Overall Collected'}: ${formatCurrencyExact(summary.overallTotal, language)}`,
    190,
    afterTableY + 25,
    { align: 'right' }
  );

  const sigY = afterTableY + 52;
  doc.setDrawColor(...CHARCOAL);
  doc.line(14, sigY, 72, sigY);
  doc.line(82, sigY, 140, sigY);
  doc.line(150, sigY, 196, sigY);

  doc.setFontSize(8.5);
  doc.setTextColor(...SOFT_GRAY);
  doc.text(language === 'es' ? 'Preparado por' : 'Prepared by', 14, sigY + 5);
  doc.text(language === 'es' ? 'Recibido por (Propietario)' : 'Received by (Owner)', 82, sigY + 5);
  doc.text(translate(language, 'date'), 150, sigY + 5);

  drawFooter(doc, language);
  doc.save(`LVB_Daily_Cash_${collectorName.replace(/\s+/g, '_')}_${date}.pdf`);
}

export function generateTableReportPdf(params: {
  title: string;
  dateRangeLabel: string;
  filterSummary: string;
  headers: string[];
  rows: (string | number)[][];
  totalsLine?: string;
  filename: string;
  language: Language;
}) {
  const {
    title,
    dateRangeLabel,
    filterSummary,
    headers,
    rows,
    totalsLine,
    filename,
    language,
  } = params;

  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: headers.length > 6 ? 'landscape' : 'portrait',
  });

  drawBrandHeader(doc, title, `${dateRangeLabel} · ${filterSummary}`, [
    `${language === 'es' ? 'Generado' : 'Generated'}: ${new Date().toISOString().slice(0, 10)}`,
    `${language === 'es' ? 'Registros' : 'Records'}: ${rows.length}`,
  ]);

  autoTable(doc, {
    startY: 48,
    headStyles: { fillColor: OLIVE, textColor: [255, 255, 255], fontSize: 8.5 },
    alternateRowStyles: { fillColor: PORCELAIN },
    styles: { fontSize: 8.2, cellPadding: 2.8, textColor: CHARCOAL },
    head: [headers],
    body: rows.length > 0 ? rows : [[language === 'es' ? 'Sin datos para los filtros seleccionados' : 'No data for selected filters']],
  });

  if (totalsLine) {
    const afterY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...CHARCOAL);
    doc.text(totalsLine, 14, afterY);
  }

  drawFooter(doc, language);
  doc.save(`${filename}.pdf`);
}

export function exportToCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  filename: string
) {
  const escape = (val: unknown) => {
    const s = val == null ? '' : String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csvContent =
    '\uFEFF' +
    [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join(
      '\n'
    );
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildDepositReceiptPayload(
  deposit: Deposit,
  student: Student,
  academyClass: AcademyClass | undefined,
  language: Language
) {
  return {
    receiptNumber: deposit.receiptNumber,
    student,
    academyClass,
    date: deposit.date,
    amount: deposit.amount,
    method: deposit.method,
    collectorName: deposit.collectorName,
    isConfirmed: deposit.status === 'confirmed',
    categoryLabel: translate(language, 'deposit'),
    notes: deposit.notes,
    language,
  };
}
