import React, { useMemo, useState } from 'react';
import { FileText, Download, Search, Printer } from 'lucide-react';
import { useApp } from '../../services/store';
import { canViewPayment } from '../../permissions/permissions';
import { formatCurrencyExact } from '../../calculations/paymentEngine';
import {
  generateDailyCashReportPdf,
  generateReceiptPdf,
} from '../../services/pdfExport';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
} from '../../components/ui/Primitives';

interface DocItem {
  id: string;
  docNumber: string;
  type: 'receipt' | 'pending_deposit' | 'daily_cash';
  title: string;
  subtitle: string;
  date: string;
  amount: number;
  onDownload: () => void;
}

export const DocumentsPage: React.FC = () => {
  const { state, currentUser, t } = useApp();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | DocItem['type']>('all');

  const documents = useMemo(() => {
    if (!currentUser) return [];
    const list: DocItem[] = [];

    // 1. Confirmed Payment Receipts (authorized only)
    state.payments
      .filter((p) => canViewPayment(currentUser, p))
      .forEach((p) => {
        const stu = state.students.find((s) => s.id === p.studentId);
        const cls = state.classes.find((c) => c.id === p.classId);
        if (!stu) return;
        list.push({
          id: `doc-pay-${p.id}`,
          docNumber: p.receiptNumber,
          type: 'receipt',
          title: `${p.receiptNumber} — ${stu.fullName}`,
          subtitle: `${p.category === 'deposit' ? t('deposit') : `Week ${p.week} Tuition`} · ${p.collectorName}`,
          date: p.date,
          amount: p.amount,
          onDownload: () =>
            generateReceiptPdf({
              receiptNumber: p.receiptNumber,
              student: stu,
              academyClass: cls,
              date: p.date,
              amount: p.amount,
              method: p.method,
              collectorName: p.collectorName,
              isConfirmed: true,
              categoryLabel: p.category === 'deposit' ? t('deposit') : `Week ${p.week} Tuition`,
              notes: p.notes,
              language: state.language,
            }),
        });
      });

    // 2. Pending Deposit Receipts
    state.deposits
      .filter(
        (d) =>
          d.status === 'pending' &&
          (currentUser.role === 'owner' || d.collectorId === currentUser.id)
      )
      .forEach((dep) => {
        const stu = state.students.find((s) => s.id === dep.studentId);
        const cls = state.classes.find((c) => c.id === dep.classId);
        if (!stu) return;
        list.push({
          id: `doc-dep-${dep.id}`,
          docNumber: dep.receiptNumber,
          type: 'pending_deposit',
          title: `${dep.receiptNumber} — ${stu.fullName} (Pending)`,
          subtitle: `Pending Deposit · ${dep.collectorName}`,
          date: dep.date,
          amount: dep.amount,
          onDownload: () =>
            generateReceiptPdf({
              receiptNumber: dep.receiptNumber,
              student: stu,
              academyClass: cls,
              date: dep.date,
              amount: dep.amount,
              method: dep.method,
              collectorName: dep.collectorName,
              isConfirmed: false,
              categoryLabel: t('deposit'),
              notes: dep.notes,
              language: state.language,
            }),
        });
      });

    // 3. Daily Cash Reports (derived from cash handoffs)
    state.cashHandoffs
      .filter((h) => currentUser.role === 'owner' || h.collectorId === currentUser.id)
      .forEach((h) => {
        const linked = state.payments.filter((p) => h.paymentIds.includes(p.id));
        list.push({
          id: `doc-dcr-${h.id}`,
          docNumber: `DCR-${h.date}`,
          type: 'daily_cash',
          title: `Daily Cash Report — ${h.collectorName}`,
          subtitle: `${h.transactionCount} transactions · Cash ${formatCurrencyExact(h.expectedCash, state.language)} (${h.status})`,
          date: h.date,
          amount: h.overallTotal,
          onDownload: () =>
            generateDailyCashReportPdf({
              collectorName: h.collectorName,
              date: h.date,
              payments: linked,
              students: state.students,
              classes: state.classes,
              language: state.language,
            }),
        });
      });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [state, currentUser, t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents
      .filter((d) => (typeFilter === 'all' ? true : d.type === typeFilter))
      .filter((d) => {
        if (!q) return true;
        return (
          d.title.toLowerCase().includes(q) ||
          d.docNumber.toLowerCase().includes(q) ||
          d.subtitle.toLowerCase().includes(q)
        );
      });
  }, [documents, typeFilter, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_documents')}
        phase={t('phase2')}
        subtitle={
          state.language === 'es'
            ? 'Archivo centralizado de recibos secuenciales LVB y cortes diarios autorizados para tu rol.'
            : 'Centralized archive of sequential LVB receipts and daily cash reports authorized for your role.'
        }
        actions={
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" />
            {t('print')}
          </Button>
        }
      />

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slatewarm absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              state.language === 'es'
                ? 'Buscar recibo, alumna o reporte...'
                : 'Search receipt number, student, or report...'
            }
            className="w-full h-10 pl-9 pr-3 text-sm bg-porcelain border border-borderwarm rounded-lg"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | DocItem['type'])}
          className="h-10 px-3 text-sm bg-porcelain border border-borderwarm rounded-lg"
        >
          <option value="all">{t('all')}</option>
          <option value="receipt">Confirmed Receipts</option>
          <option value="pending_deposit">Pending Deposit Receipts</option>
          <option value="daily_cash">Daily Cash Reports</option>
        </select>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-5 h-5" />}
          title={t('noResults')}
          description={t('noResultsHint')}
        />
      ) : (
        <Card className="divide-y divide-borderwarm">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-porcelain/50 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    tone={
                      doc.type === 'receipt'
                        ? 'sage'
                        : doc.type === 'pending_deposit'
                          ? 'amber'
                          : 'navy'
                    }
                  >
                    {doc.type === 'receipt'
                      ? 'Receipt'
                      : doc.type === 'pending_deposit'
                        ? 'Pending Deposit'
                        : 'Daily Cash'}
                  </Badge>
                  <span className="text-xs text-slatewarm tabular-nums">{doc.date}</span>
                </div>
                <div className="text-sm font-semibold text-navy mt-1">{doc.title}</div>
                <div className="text-xs text-slatewarm">{doc.subtitle}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold text-navy tabular-nums">
                  {formatCurrencyExact(doc.amount, state.language)}
                </span>
                <Button size="sm" variant="secondary" onClick={doc.onDownload}>
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};
