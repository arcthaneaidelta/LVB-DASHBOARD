import React, { useMemo, useState } from 'react';
import {
  Package,
  Search,
  AlertTriangle,
  Minus,
  Plus,
  Download,
  FileSpreadsheet,
  Ship,
} from 'lucide-react';
import { useApp } from '../../services/store';
import { canViewInventoryCosts } from '../../permissions/permissions';
import { formatCurrencyExact, roundCurrency } from '../../calculations/paymentEngine';
import { exportToCsv, generateTableReportPdf } from '../../services/pdfExport';
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  KpiCard,
  PageHeader,
} from '../../components/ui/Primitives';
import type { InventoryCategory, InventoryProduct } from '../../types';

const CATEGORIES: InventoryCategory[] = [
  'Acrylic & Liquid Monomer',
  'Gel & Builder Systems',
  'Tools, Brushes & Implements',
  'Sanitation & Disposables',
  'Student Kits & Packaging',
];

type StockFilter = 'all' | 'order_now' | 'reorder_soon' | 'normal' | 'lead_time';

export function getStockStatus(qty: number): 'order_now' | 'reorder_soon' | 'normal' {
  // PRD Section 21.3: <= 5 Order Now, < 10 Reorder Soon, >= 10 Normal
  if (qty <= 5) return 'order_now';
  if (qty < 10) return 'reorder_soon';
  return 'normal';
}

export const InventoryPage: React.FC = () => {
  const { state, currentUser, updateInventoryQuantity, pushToast, t } = useApp();

  const canSeeCosts = currentUser ? canViewInventoryCosts(currentUser) : false;

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | InventoryCategory>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [drawerQty, setDrawerQty] = useState('');
  const [drawerNotes, setDrawerNotes] = useState('');

  const stats = useMemo(() => {
    const orderNow = state.inventory.filter((i) => i.quantity <= 5).length;
    const reorderSoon = state.inventory.filter((i) => i.quantity > 5 && i.quantity < 10).length;
    const leadTimeLow = state.inventory.filter(
      (i) => i.leadTimeFlag !== 'none' && i.quantity < 10
    ).length;
    const totalValue = roundCurrency(
      state.inventory.reduce((s, i) => s + i.quantity * i.unitCost, 0)
    );
    const byCategory = CATEGORIES.map((cat) => {
      const items = state.inventory.filter((i) => i.category === cat);
      return {
        category: cat,
        count: items.length,
        units: items.reduce((s, i) => s + i.quantity, 0),
        value: roundCurrency(items.reduce((s, i) => s + i.quantity * i.unitCost, 0)),
        orderNow: items.filter((i) => i.quantity <= 5).length,
      };
    });
    return { totalProducts: state.inventory.length, orderNow, reorderSoon, leadTimeLow, totalValue, byCategory };
  }, [state.inventory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.inventory.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      const st = getStockStatus(item.quantity);
      if (stockFilter === 'order_now' && st !== 'order_now') return false;
      if (stockFilter === 'reorder_soon' && st !== 'reorder_soon') return false;
      if (stockFilter === 'normal' && st !== 'normal') return false;
      if (stockFilter === 'lead_time' && item.leadTimeFlag === 'none') return false;
      if (q) {
        return (
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.supplier.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [state.inventory, categoryFilter, stockFilter, search]);

  const selectedProduct: InventoryProduct | null = useMemo(
    () => state.inventory.find((i) => i.id === selectedProductId) ?? null,
    [state.inventory, selectedProductId]
  );

  const openDrawer = (item: InventoryProduct) => {
    setSelectedProductId(item.id);
    setDrawerQty(String(item.quantity));
    setDrawerNotes(item.notes);
  };

  const handleExport = (fmt: 'pdf' | 'csv') => {
    const headers = canSeeCosts
      ? ['SKU', 'Product', 'Category', 'Qty', 'Status', 'Unit Cost', 'Value', 'Lead Time']
      : ['SKU', 'Product', 'Category', 'Qty', 'Status', 'Lead Time'];
    const rows = filtered.map((i) => {
      const statusStr =
        i.quantity <= 5 ? 'Order Now' : i.quantity < 10 ? 'Reorder Soon' : 'Normal';
      return canSeeCosts
        ? [i.sku, i.name, i.category, i.quantity, statusStr, i.unitCost.toFixed(2), (i.quantity * i.unitCost).toFixed(2), i.leadTimeFlag]
        : [i.sku, i.name, i.category, i.quantity, statusStr, i.leadTimeFlag];
    });
    if (fmt === 'csv') {
      exportToCsv(headers, rows, 'LVB_Inventory.csv');
    } else {
      generateTableReportPdf({
        title: canSeeCosts ? 'Inventory & Investment Valuation' : 'Studio Inventory Counts',
        dateRangeLabel: 'As of 2026-11-24',
        filterSummary: `Category: ${categoryFilter} | Filter: ${stockFilter}`,
        headers,
        rows,
        totalsLine: canSeeCosts
          ? `Filtered Investment Value: ${formatCurrencyExact(
              filtered.reduce((s, i) => s + i.quantity * i.unitCost, 0),
              state.language
            )}`
          : undefined,
        filename: 'LVB_Inventory',
        language: state.language,
      });
    }
    pushToast(t('toastExportSuccess'));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav_inventory')}
        phase={t('phase2')}
        subtitle={
          canSeeCosts
            ? state.language === 'es'
              ? '101 productos en 5 secciones, alertas de pedido (China / Legacy Nails) y valor total de inversión.'
              : '101 studio products across 5 sections, China & Legacy Nails lead-time alerts, and full owner valuation.'
            : state.language === 'es'
              ? 'Modo solo conteo de inventario (costos y valuación visibles únicamente para propietarios).'
              : 'Counts-only inventory access (unit costs and financial valuation are visible to Owners only).'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => handleExport('csv')}>
              <FileSpreadsheet className="w-3.5 h-3.5" />
              CSV
            </Button>
            {canSeeCosts && (
              <Button size="sm" onClick={() => handleExport('pdf')}>
                <Download className="w-3.5 h-3.5" />
                {t('exportPdf')}
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          label={state.language === 'es' ? 'Total Productos' : 'Total Products'}
          value={stats.totalProducts}
          subtext={state.language === 'es' ? '5 secciones de estudio' : '5 studio sections'}
        />
        <KpiCard
          label={t('stockOrderNow')}
          value={stats.orderNow}
          subtext={state.language === 'es' ? '5 o menos unidades' : '5 or fewer units'}
          tone="terracotta"
          onClick={() => setStockFilter('order_now')}
        />
        <KpiCard
          label={t('stockReorderSoon')}
          value={stats.reorderSoon}
          subtext={state.language === 'es' ? '6 a 9 unidades' : 'Under 10 units'}
          tone="amber"
          onClick={() => setStockFilter('reorder_soon')}
        />
        {canSeeCosts ? (
          <KpiCard
            label={state.language === 'es' ? 'Valor de Inversión' : 'Investment Value'}
            value={formatCurrencyExact(stats.totalValue, state.language)}
            subtext={`${stats.leadTimeLow} ${state.language === 'es' ? 'alertas China/Legacy' : 'China/Legacy low-stock flags'}`}
            tone="default"
          />
        ) : (
          <KpiCard
            label={state.language === 'es' ? 'Alertas Tiempo de Envío' : 'Lead-Time Alerts'}
            value={stats.leadTimeLow}
            subtext="China & Legacy Nails (<10 qty)"
            tone="amber"
            onClick={() => setStockFilter('lead_time')}
          />
        )}
      </div>

      {/* Owner-Only Category Valuation Strip */}
      {canSeeCosts && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {stats.byCategory.map((c) => (
            <button
              key={c.category}
              type="button"
              onClick={() =>
                setCategoryFilter((prev) => (prev === c.category ? 'all' : c.category))
              }
              className={`p-3.5 rounded-card border text-left transition-colors ${
                categoryFilter === c.category
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white border-borderwarm hover:border-champagne'
              }`}
            >
              <div
                className={`text-[11px] font-medium truncate ${
                  categoryFilter === c.category ? 'text-champagne-soft' : 'text-slatewarm'
                }`}
              >
                {c.category}
              </div>
              <div className="text-base font-semibold tabular-nums mt-1">
                {formatCurrencyExact(c.value, state.language)}
              </div>
              <div
                className={`text-[11px] mt-0.5 ${
                  categoryFilter === c.category ? 'text-white/70' : 'text-slatewarm'
                }`}
              >
                {c.count} items · {c.orderNow} Order Now
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slatewarm absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                state.language === 'es'
                  ? 'Buscar producto, SKU o proveedor...'
                  : 'Search product, SKU, or supplier...'
              }
              className="w-full h-10 pl-9 pr-3 text-sm bg-porcelain border border-borderwarm rounded-lg"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | InventoryCategory)}
            className="h-10 px-3 text-sm bg-porcelain border border-borderwarm rounded-lg"
          >
            <option value="all">{state.language === 'es' ? 'Todas las secciones (5)' : 'All 5 sections'}</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              ['all', `${t('all')} (${state.inventory.length})`],
              ['order_now', `${t('stockOrderNow')} (≤5)`],
              ['reorder_soon', `${t('stockReorderSoon')} (6–9)`],
              ['normal', `${t('stockNormal')} (10+)`],
              ['lead_time', 'China & Legacy Nails'],
            ] as [StockFilter, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setStockFilter(val)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                stockFilter === val
                  ? 'bg-navy text-white border-navy'
                  : 'bg-porcelain text-slatewarm border-borderwarm hover:text-navy'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Product List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-5 h-5" />}
          title={t('noResults')}
          description={t('noResultsHint')}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-porcelain border-b border-borderwarm text-[11px] uppercase tracking-wider text-slatewarm">
                  <th className="py-3 px-4">{state.language === 'es' ? 'Producto' : 'Product'}</th>
                  <th className="py-3 px-4 hidden md:table-cell">{state.language === 'es' ? 'Sección' : 'Section'}</th>
                  <th className="py-3 px-4">{t('status')}</th>
                  <th className="py-3 px-4 text-center">{state.language === 'es' ? 'Cantidad' : 'Quantity'}</th>
                  {canSeeCosts && (
                    <>
                      <th className="py-3 px-4 text-right hidden sm:table-cell">Unit Cost</th>
                      <th className="py-3 px-4 text-right">Value</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-borderwarm">
                {filtered.map((item) => {
                  const st = getStockStatus(item.quantity);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => openDrawer(item)}
                      className="hover:bg-porcelain/60 cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-navy">{item.name}</div>
                        <div className="text-[11px] text-slatewarm flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="font-mono">{item.sku}</span>
                          <span>· {item.supplier}</span>
                          {item.leadTimeFlag === 'china' && (
                            <Badge tone="amber" className="text-[10px]">
                              <Ship className="w-3 h-3" /> {t('leadChina')}
                            </Badge>
                          )}
                          {item.leadTimeFlag === 'legacy_nails' && (
                            <Badge tone="champagne" className="text-[10px]">
                              <AlertTriangle className="w-3 h-3" /> {t('leadLegacy')}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-xs text-slatewarm">
                        {item.category}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          tone={
                            st === 'order_now'
                              ? 'terracotta'
                              : st === 'reorder_soon'
                                ? 'amber'
                                : 'sage'
                          }
                        >
                          {st === 'order_now'
                            ? t('stockOrderNow')
                            : st === 'reorder_soon'
                              ? t('stockReorderSoon')
                              : t('stockNormal')}
                        </Badge>
                      </td>
                      <td
                        className="py-3 px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5 justify-center w-full">
                          <button
                            type="button"
                            onClick={() =>
                              updateInventoryQuantity(
                                item.id,
                                Math.max(0, item.quantity - 1)
                              )
                            }
                            className="w-7 h-7 rounded-md border border-borderwarm bg-white hover:bg-ivory flex items-center justify-center text-navy"
                            aria-label={`Decrease ${item.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-9 text-center font-semibold text-navy tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateInventoryQuantity(item.id, item.quantity + 1)
                            }
                            className="w-7 h-7 rounded-md border border-borderwarm bg-white hover:bg-ivory flex items-center justify-center text-navy"
                            aria-label={`Increase ${item.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      {canSeeCosts && (
                        <>
                          <td className="py-3 px-4 text-right tabular-nums text-slatewarm hidden sm:table-cell">
                            {formatCurrencyExact(item.unitCost, state.language)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-navy tabular-nums">
                            {formatCurrencyExact(
                              item.quantity * item.unitCost,
                              state.language
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Product Detail Drawer */}
      <Drawer
        open={Boolean(selectedProduct)}
        onClose={() => setSelectedProductId(null)}
        title={selectedProduct?.name ?? ''}
        subtitle={selectedProduct ? `${selectedProduct.sku} · ${selectedProduct.category}` : ''}
      >
        {selectedProduct && (() => {
          const st = getStockStatus(selectedProduct.quantity);
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  tone={
                    st === 'order_now'
                      ? 'terracotta'
                      : st === 'reorder_soon'
                        ? 'amber'
                        : 'sage'
                  }
                >
                  {st === 'order_now'
                    ? t('stockOrderNow')
                    : st === 'reorder_soon'
                      ? t('stockReorderSoon')
                      : t('stockNormal')}
                </Badge>
                {selectedProduct.leadTimeFlag === 'china' && (
                  <Badge tone="amber">{t('leadChina')}</Badge>
                )}
                {selectedProduct.leadTimeFlag === 'legacy_nails' && (
                  <Badge tone="champagne">{t('leadLegacy')}</Badge>
                )}
              </div>

              <Card className="p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slatewarm">Supplier</span>
                  <span className="font-medium text-navy">{selectedProduct.supplier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slatewarm">Last Updated</span>
                  <span className="font-medium text-navy">{selectedProduct.lastUpdated}</span>
                </div>
                {canSeeCosts && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slatewarm">Unit Cost</span>
                      <span className="font-semibold text-navy tabular-nums">
                        {formatCurrencyExact(selectedProduct.unitCost, state.language)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slatewarm">Total Line Valuation</span>
                      <span className="font-semibold text-navy tabular-nums">
                        {formatCurrencyExact(
                          selectedProduct.quantity * selectedProduct.unitCost,
                          state.language
                        )}
                      </span>
                    </div>
                  </>
                )}
              </Card>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateInventoryQuantity(
                    selectedProduct.id,
                    Number(drawerQty),
                    drawerNotes
                  );
                  setSelectedProductId(null);
                }}
                className="space-y-3"
              >
                <label className="block text-sm">
                  <span className="text-xs font-medium text-navy">
                    {state.language === 'es' ? 'Ajustar Cantidad' : 'Set Quantity on Hand'}
                  </span>
                  <input
                    type="number"
                    min={0}
                    required
                    value={drawerQty}
                    onChange={(e) => setDrawerQty(e.target.value)}
                    className="mt-1 w-full h-11 px-3 rounded-lg border border-borderwarm bg-white text-base font-semibold tabular-nums"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-medium text-navy">{t('notes')}</span>
                  <textarea
                    rows={3}
                    value={drawerNotes}
                    onChange={(e) => setDrawerNotes(e.target.value)}
                    className="mt-1 w-full p-2.5 rounded-lg border border-borderwarm bg-white"
                  />
                </label>
                <Button type="submit" className="w-full">
                  {t('save')}
                </Button>
              </form>
            </div>
          );
        })()}
      </Drawer>
    </div>
  );
};
