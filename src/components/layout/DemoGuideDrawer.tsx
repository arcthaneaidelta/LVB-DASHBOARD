import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ClipboardCheck,
  Banknote,
  Receipt,
  Package,
  Landmark,
  Globe,
} from 'lucide-react';
import { useApp } from '../../services/store';
import { Badge, Drawer } from '../ui/Primitives';

export const DemoGuideDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { state, selectUser, setLanguage, pushToast } = useApp();
  const navigate = useNavigate();

  const scenarios = [
    {
      id: 'sc-1',
      tag: 'Instructor · Mobile First',
      icon: ClipboardCheck,
      title:
        state.language === 'es'
          ? '1. Asistencia en un toque y cobro dinámico'
          : '1. One-Tap Class Attendance & Dynamic Tuition',
      desc:
        state.language === 'es'
          ? 'Entra como Marisol, abre el Registro de Clase (Semana 4), marca Presente/Ausente y registra un cobro con cálculo automático.'
          : 'Switches to Marisol on Tuesday Nail Foundations (Week 4). Tap P/A/C/E and collect a weekly tuition payment.',
      run: () => {
        selectUser('user-marisol');
        navigate('/app/class-log');
        pushToast('Demo Guide: Signed in as Marisol — tap P/A/C/E or Collect on Week 4.', 'info');
        onClose();
      },
    },
    {
      id: 'sc-2',
      tag: 'Money Loop · Locking',
      icon: Banknote,
      title:
        state.language === 'es'
          ? '2. Enviar entrega de efectivo y bloquear como Propietario'
          : '2. Submit Cash Handoff & Lock as Owner',
      desc:
        state.language === 'es'
          ? 'Revisa el borrador de hoy de Marisol ($30 efectivo / $25 Zelle), envíalo y luego cambia a Rudy para confirmar y bloquear.'
          : 'Opens Marisol’s unsubmitted cash draft ($30 cash / $25 Zelle). Submit it, then switch to Rudy to verify & lock.',
      run: () => {
        selectUser('user-marisol');
        navigate('/app/cash-handoff');
        pushToast('Demo Guide: Submit today’s handoff as Marisol, then switch to Rudy to lock it.', 'info');
        onClose();
      },
    },
    {
      id: 'sc-3',
      tag: 'Owner · Checklist Automation',
      icon: Receipt,
      title:
        state.language === 'es'
          ? '3. Confirmar depósito pendiente de $50'
          : '3. Confirm Catherine’s $50 Pending Deposit',
      desc:
        state.language === 'es'
          ? 'Entra como Rudy, confirma el depósito de Catherine Pereira y observa cómo completa automáticamente el paso 4/4 de inscripción.'
          : 'Switches to Rudy in Deposits. Confirm Catherine’s $50 cash deposit to auto-complete her 4-step enrollment checklist.',
      run: () => {
        selectUser('user-rudy');
        navigate('/app/deposits');
        pushToast('Demo Guide: Click Confirm on Catherine’s $50 deposit to post to ledger.', 'info');
        onClose();
      },
    },
    {
      id: 'sc-4',
      tag: 'Role Privacy · 101 Items',
      icon: Package,
      title:
        state.language === 'es'
          ? '4. Inventario de 101 productos: Costos vs. Solo Conteo'
          : '4. 101-Item Inventory: Owner Value vs. Staff Counts-Only',
      desc:
        state.language === 'es'
          ? 'Abre el inventario como Lizy (Personal) para ver modo solo conteo sin costos, y luego cambia a Rudy para ver la valuación completa.'
          : 'Opens Inventory as Lizy (Staff) in counts-only mode (no unit costs). Switch to Rudy to reveal full valuation & China/Legacy flags.',
      run: () => {
        selectUser('user-lizy');
        navigate('/app/inventory');
        pushToast('Demo Guide: Viewing Inventory as Lizy (Counts Only). Switch to Rudy for Valuation.', 'info');
        onClose();
      },
    },
    {
      id: 'sc-5',
      tag: 'Accounting · PDF & CSV',
      icon: Landmark,
      title:
        state.language === 'es'
          ? '5. Contabilidad interactiva y exportación PDF/CSV'
          : '5. Interactive Accounting & Branded PDF/CSV Export',
      desc:
        state.language === 'es'
          ? 'Filtra cobranza por clase, método o cobrador, revisa atrasos y descarga reportes PDF con marca La Voute.'
          : 'Switches to Rudy in Accounting. Click any bar to cross-filter and export branded Atelier PDF or CSV reports.',
      run: () => {
        selectUser('user-rudy');
        navigate('/app/accounting');
        pushToast('Demo Guide: Click any breakdown bar to cross-filter or export PDF/CSV.', 'info');
        onClose();
      },
    },
    {
      id: 'sc-6',
      tag: 'Bilingual First-Class',
      icon: Globe,
      title:
        state.language === 'es'
          ? '6. Experiencia completa en Español para Instructoras'
          : '6. First-Class Spanish Studio Experience (ES)',
      desc:
        state.language === 'es'
          ? 'Activa Español en toda la aplicación y abre el espacio móvil de Marisol con etiquetas y PDFs en español natural.'
          : 'Switches the entire platform to natural operational Spanish and opens Marisol’s Class Log.',
      run: () => {
        setLanguage('es');
        selectUser('user-marisol');
        navigate('/app/class-log');
        pushToast('Guía Demo: Idioma cambiado a Español en el espacio de Marisol.', 'info');
        onClose();
      },
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={state.language === 'es' ? 'Guía Interactiva de Demostración' : 'Interactive Demo Walkthrough'}
      subtitle={
        state.language === 'es'
          ? 'Lanza cualquiera de los 6 recorridos clave con un solo clic.'
          : 'Launch any of the 6 signature academy workflows in a single click.'
      }
      widthClass="sm:max-w-lg"
    >
      <div className="space-y-3">
        <div className="p-4 rounded-atelier bg-olive text-porcelain text-xs leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-clay shrink-0 mt-0.5" />
          <span>
            {state.language === 'es'
              ? 'Todos los escenarios usan el mismo libro compartido. Los cambios que hagas en un rol aparecen inmediatamente en los demás.'
              : 'Every walkthrough shares one live operational ledger. Actions performed as an Instructor immediately appear in the Owner dashboard and reports.'}
          </span>
        </div>

        <div className="space-y-2.5">
          {scenarios.map((sc) => {
            const Icon = sc.icon;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={sc.run}
                className="w-full text-left p-4 rounded-atelier bg-white border border-hairline hover:border-olive hover:bg-porcelain/50 transition-all group"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <Badge tone="clay">
                    <Icon className="w-3 h-3" /> {sc.tag}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-softgray group-hover:text-olive group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="text-sm font-semibold text-charcoal">{sc.title}</div>
                <p className="text-xs text-softgray mt-1 leading-relaxed">{sc.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </Drawer>
  );
};
