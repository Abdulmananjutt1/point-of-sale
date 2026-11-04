"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ShoppingCart,
  History,
  Scan,
  PauseCircle,
  Key,
  Banknote,
  ClipboardPen,
  Loader2,
  Search,
  X,
  CreditCard,
  DollarSign,
  UserCheck,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
} from "lucide-react";

import Header from "@/components/layout/Header";
import MedicineGrid from "@/components/sales/MedicineGrid";
import BarcodeInput from "@/components/sales/BarcodeInput";
import CartPanel from "@/components/sales/CartPanel";
import PaymentModal from "@/components/sales/PaymentModal";
import SplitPaymentModal from "@/components/sales/SplitPaymentModal";
import InvoicePrint from "@/components/sales/InvoicePrint";
import SaleHistoryPanel from "@/components/sales/SaleHistoryPanel";
import QuickAddCustomerModal from "@/components/sales/QuickAddCustomerModal";
import HeldSalesDrawer from "@/components/sales/HeldSalesDrawer";
import PINPadModal from "@/components/sales/PINPadModal";
import CashShiftModal from "@/components/sales/CashShiftModal";
import PrescriptionModal, { PrescriptionData } from "@/components/sales/PrescriptionModal";
import GenericSubstitutionModal from "@/components/sales/GenericSubstitutionModal";

import { useCartCalculations } from "@/hooks/useCartCalculations";
import { useDiscountInput } from "@/hooks/useDiscountInput";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { usePharmacyStore } from "@/store";

import {
  Customer,
  Medicine,
  PaymentMethod,
  Sale,
  SaleItem,
  SplitPaymentEntry,
  HeldSale,
} from "@/types";
import { medicineService } from "@/services/medicineService";
import { customerService } from "@/services/customerService";
import { saleService } from "@/services/saleService";
import { cashShiftService } from "@/services/cashShiftService";
import { apiPost } from "@/lib/apiClient";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { generateId, generateInvoiceNumber } from "@/lib/utils";

type Tab = "pos" | "history";

export default function SalesPage() {
  // ── Real data from API ─────────────────────────────────────────────────────
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [hasOpenShift, setHasOpenShift] = useState(false);

  // ── Cart state (local only) ────────────────────────────────────────────────
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);

  // ── Settings from store ────────────────────────────────────────────────────
  const { settings } = usePharmacyStore();

  // ── UI state ───────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>("pos");
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showHeldDrawer, setShowHeldDrawer] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPIN, setShowPIN] = useState(false);
  const [showShift, setShowShift] = useState(false);
  const [shiftMode, setShiftMode] = useState<"open" | "close" | "summary">("open");
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData | null>(null);
  const [showGenericModal, setShowGenericModal] = useState(false);
  const [genericSource, setGenericSource] = useState<Medicine | null>(null);
  const processingRef = useRef(false);

  // ── Discount ───────────────────────────────────────────────────────────────
  const subtotalRaw = cart.reduce((s, i) => s + i.total, 0);
  const discountState = useDiscountInput(subtotalRaw);
  const totals = useCartCalculations(cart, discountState.discountAmount);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setDataLoading(true);
      try {
        const [medRes, cusRes, salesRes] = await Promise.all([
          medicineService.getAll({ limit: 500 }).catch((e) => {
            console.error("Failed to load medicines:", e);
            toastApiError(e);
            return { medicines: [], total: 0, page: 1, totalPages: 1 };
          }),
          customerService.getAll({ limit: 500 }).catch((e) => {
            console.error("Failed to load customers:", e);
            return { customers: [], total: 0, page: 1, totalPages: 1 };
          }),
          saleService.getAll({ limit: 100 }).catch((e) => {
            console.error("Failed to load sales:", e);
            return { sales: [], total: 0, page: 1, totalPages: 1 };
          }),
        ]);
        setMedicines(medRes.medicines);
        setCustomers(cusRes.customers);
        setSales(salesRes.sales);

        cashShiftService
          .getCurrent()
          .then((shift) => setHasOpenShift(!!shift))
          .catch(() => setHasOpenShift(false));
      } catch (err) {
        toastApiError(err);
      } finally {
        setDataLoading(false);
      }
    }
    load();
  }, []);

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const addToCart = useCallback((med: Medicine, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.medicineId === med.id);
      if (existing) {
        return prev.map((i) =>
          i.medicineId === med.id
            ? {
                ...i,
                quantity: i.quantity + quantity,
                total: (i.quantity + quantity) * i.unitPrice * (1 - i.discount / 100),
              }
            : i
        );
      }
      return [
        ...prev,
        {
          medicineId: med.id,
          medicineName: med.name,
          quantity,
          unitPrice: med.sellingPrice,
          discount: 0,
          total: quantity * med.sellingPrice,
          expiryDate: med.expiryDate,
          prescriptionRequired: med.requiresPrescription,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((medicineId: string) => {
    setCart((prev) => prev.filter((i) => i.medicineId !== medicineId));
  }, []);

  const updateCartQuantity = useCallback((medicineId: string, quantity: number) => {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.medicineId !== medicineId)
        : prev.map((i) =>
            i.medicineId === medicineId
              ? { ...i, quantity, total: quantity * i.unitPrice * (1 - i.discount / 100) }
              : i
          )
    );
  }, []);

  const updateCartItemDiscount = useCallback((medicineId: string, discount: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.medicineId === medicineId
          ? { ...i, discount, total: i.quantity * i.unitPrice * (1 - discount / 100) }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedCustomer(null);
    discountState.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Hold / Resume ──────────────────────────────────────────────────────────
  const holdSale = useCallback(() => {
    if (cart.length === 0) return;
    const label = `Sale ${new Date().toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
    const held: HeldSale = {
      id: `HLD${generateId()}`,
      label,
      cart: [...cart],
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name ?? "Walk-in",
      discount: discountState.discountAmount,
      heldAt: new Date().toISOString(),
    };
    setHeldSales((prev) => [held, ...prev]);
    setCart([]);
    setSelectedCustomer(null);
    discountState.reset();
    toastSuccess("Sale parked on hold — resume anytime");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, selectedCustomer, discountState.discountAmount]);

  const resumeHeld = useCallback(
    (heldId: string) => {
      const held = heldSales.find((h) => h.id === heldId);
      if (!held) return;
      const customer = held.customerId
        ? customers.find((c) => c.id === held.customerId) ?? null
        : null;
      setCart([...held.cart]);
      setSelectedCustomer(customer);
      setHeldSales((prev) => prev.filter((h) => h.id !== heldId));
    },
    [heldSales, customers]
  );

  const deleteHeld = useCallback((heldId: string) => {
    setHeldSales((prev) => prev.filter((h) => h.id !== heldId));
  }, []);

  // ── Barcode scanner ────────────────────────────────────────────────────────
  const handleScanCode = useCallback(
    (code: string) => {
      const med = medicines.find(
        (m) =>
          m.id.toLowerCase() === code.toLowerCase() ||
          m.batchNumber?.toLowerCase() === code.toLowerCase()
      );
      if (!med) {
        toastApiError(new Error(`No medicine found for: ${code}`));
        return;
      }
      if (med.stock === 0) {
        toastApiError(new Error(`${med.name} is out of stock`));
        return;
      }
      addToCart(med);
      toastSuccess(`${med.name} scanned into cart`);
    },
    [medicines, addToCart]
  );

  useBarcodeScanner({
    onScan: handleScanCode,
    enabled: tab === "pos" && !showPaymentModal && !showSplitModal,
  });

  // ── Select medicine ────────────────────────────────────────────────────────
  const handleSelectMedicine = (med: Medicine) => {
    if (med.stock === 0) {
      toastApiError(new Error(`${med.name} is out of stock`));
      return;
    }
    addToCart(med);
    toastSuccess(`${med.name} added to cart`);
    const subs = medicines.filter(
      (m) => m.genericName === med.genericName && m.id !== med.id && m.stock > 0
    );
    if (subs.length > 0) {
      setGenericSource(med);
      setShowGenericModal(true);
    }
  };

  // ── Complete sale → real API ───────────────────────────────────────────────
  const finalizeSale = async (pm: string, discount: number, splits?: SplitPaymentEntry[]) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    try {
      // Build payload for backend
      const payload = {
        customerId: selectedCustomer?.id ?? null,
        customerName: selectedCustomer?.name ?? "Walk-in Customer",
        items: cart.map((i) => ({
          medicineId: i.medicineId,
          medicineName: i.medicineName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          total: i.total,
        })),
        subtotal: totals.subtotal,
        discount: discount,
        tax: totals.taxAmount,
        total: totals.total,
        paymentMethod: pm,
        ...(prescriptionData?.doctorName && { doctorName: prescriptionData.doctorName }),
        ...(prescriptionData?.patientName && { patientName: prescriptionData.patientName }),
        ...(prescriptionData?.prescriptionNote && {
          prescriptionNote: prescriptionData.prescriptionNote,
        }),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = await apiPost<any>("/sales", payload);

      // Map backend response to frontend Sale type
      const sale: Sale = {
        id: created.id,
        invoiceNumber:
          created.invoiceNumber ?? created.invoice_number ?? generateInvoiceNumber("INV"),
        customerId: created.customerId ?? created.customer_id,
        customerName: created.customerName ?? created.customer_name ?? "Walk-in Customer",
        items: cart,
        subtotal: Number(created.subtotal ?? totals.subtotal),
        discount: Number(created.discount ?? discount),
        tax: Number(created.tax ?? totals.taxAmount),
        total: Number(created.total ?? totals.total),
        paymentMethod: pm as PaymentMethod,
        splitPayments: splits,
        status: "Completed",
        cashierName: created.cashierName ?? created.cashier_name ?? "",
        createdAt: created.createdAt ?? created.created_at ?? new Date().toISOString(),
      };

      // Update local medicine stocks
      setMedicines((prev) =>
        prev.map((m) => {
          const item = cart.find((i) => i.medicineId === m.id);
          return item ? { ...m, stock: Math.max(0, m.stock - item.quantity) } : m;
        })
      );

      setSales((prev) => [sale, ...prev]);
      setCompletedSale(sale);
      setCart([]);
      setSelectedCustomer(null);
      discountState.reset();
      setPrescriptionData(null);
      setShowPaymentModal(false);
      setShowSplitModal(false);
      toastSuccess(`Invoice ${sale.invoiceNumber} completed!`);
      setShowInvoice(true);
    } catch (err) {
      toastApiError(err);
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const handleConfirmPayment = () => finalizeSale(paymentMethod, discountState.discountAmount);
  const handleConfirmSplit = (entries: SplitPaymentEntry[]) =>
    finalizeSale(entries[0].method, discountState.discountAmount, entries);
  const handleCheckout = () => {
    if (cart.length === 0) {
      toastApiError(new Error("Cart is empty"));
      return;
    }
    setShowPaymentModal(true);
  };
  const handleSplitCheckout = () => {
    if (cart.length === 0) {
      toastApiError(new Error("Cart is empty"));
      return;
    }
    setShowSplitModal(true);
  };
  const handleHold = () => {
    if (cart.length === 0) {
      toastApiError(new Error("Cart is empty"));
      return;
    }
    holdSale();
  };

  // ── Add customer → API ─────────────────────────────────────────────────────
  const handleAddCustomer = async (
    data: Omit<Customer, "id" | "createdAt" | "totalPurchases">
  ) => {
    try {
      const created = await customerService.create(data);
      setCustomers((prev) => [created, ...prev]);
      setSelectedCustomer(created);
      toastSuccess(`Customer ${created.name} added`);
    } catch (err) {
      toastApiError(err);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (dataLoading) {
    return (
      <div className="flex flex-col h-screen bg-slate-50">
        <Header title="Point of Sale" />
        <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
          <Loader2 size={32} className="animate-spin text-emerald-500 mb-3" />
          <span className="text-sm font-semibold text-slate-600">Initializing POS terminal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      <Header title="Point of Sale Terminal" />

      {/* POS Top Control Strip */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0 shadow-2xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setTab("pos")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === "pos"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShoppingCart size={15} className={tab === "pos" ? "text-emerald-600" : "text-slate-400"} />
            <span>POS Register</span>
            {cart.length > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {cart.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab("history")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === "history"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History size={15} className={tab === "history" ? "text-blue-600" : "text-slate-400"} />
            <span>Sale History & Invoices</span>
          </button>
        </div>

        {/* Cashier Quick Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          {tab === "pos" && (
            <button
              onClick={() => {
                setShiftMode(hasOpenShift ? "summary" : "open");
                setShowShift(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                hasOpenShift
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                  : "text-slate-700 bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  hasOpenShift ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                }`}
              />
              <Banknote size={14} />
              <span>{hasOpenShift ? "Shift Active" : "Open Shift"}</span>
            </button>
          )}

          {tab === "pos" && (
            <button
              onClick={() => setShowPrescriptionModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                prescriptionData?.doctorName
                  ? "text-violet-700 bg-violet-50 border-violet-200"
                  : "text-slate-700 bg-white border-slate-200 hover:border-violet-300 hover:text-violet-700"
              }`}
            >
              <ClipboardPen size={14} className={prescriptionData?.doctorName ? "text-violet-600" : "text-slate-400"} />
              <span>{prescriptionData?.doctorName ? `Rx: ${prescriptionData.doctorName}` : "Add Rx"}</span>
            </button>
          )}

          {tab === "pos" && settings.allowHoldSale && (
            <>
              {heldSales.length > 0 && (
                <button
                  onClick={() => setShowHeldDrawer(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all"
                >
                  <PauseCircle size={14} />
                  <span>{heldSales.length} On Hold</span>
                </button>
              )}
              <button
                onClick={handleHold}
                disabled={cart.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:text-amber-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PauseCircle size={14} />
                <span>Hold Sale</span>
              </button>
            </>
          )}

          <button
            onClick={() => setShowPIN(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:text-blue-700 transition-all"
          >
            <Key size={14} />
            <span>Switch Cashier</span>
          </button>
        </div>
      </div>

      {/* Main Terminal View */}
      <div className="flex flex-1 overflow-hidden">
        {tab === "pos" ? (
          <>
            {/* Left Column: Fast Barcode Scanner + Search + Medicine Catalog Grid */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden gap-3">
              {/* Dual Scan & Search Top Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex-shrink-0">
                {/* Barcode Scanner Gun input */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Scan size={16} />
                  </div>
                  <BarcodeInput onScan={handleScanCode} className="flex-1" />
                </div>

                {/* Medicine text search */}
                <div className="relative flex items-center">
                  <Search size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Quick search by medicine name, formula, or brand..."
                    className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Medicines Catalog Grid with Category Filter Pills */}
              <div className="flex-1 overflow-hidden">
                <MedicineGrid
                  medicines={medicines}
                  search={search}
                  onSearchChange={setSearch}
                  onSelect={handleSelectMedicine}
                  cart={cart}
                  onOpenGenericModal={(med) => {
                    setGenericSource(med);
                    setShowGenericModal(true);
                  }}
                />
              </div>
            </div>

            {/* Right Column: Checkout Cart Panel */}
            <CartPanel
              cart={cart}
              medicines={medicines}
              customers={customers}
              selectedCustomer={selectedCustomer}
              totals={totals}
              discountType={discountState.discountType}
              discountValue={discountState.discountValue}
              paymentMethod={paymentMethod}
              allowLineDiscount={settings.allowLineDiscount}
              allowSplitPayment={settings.allowSplitPayment}
              allowBillDiscount={settings.allowBillDiscount}
              taxRate={settings.taxRate}
              onSetCustomer={setSelectedCustomer}
              onAddNewCustomer={() => setShowAddCustomer(true)}
              onUpdateQty={updateCartQuantity}
              onUpdateItemDiscount={updateCartItemDiscount}
              onRemove={removeFromCart}
              onClearCart={clearCart}
              onDiscountTypeChange={discountState.setDiscountType}
              onDiscountValueChange={discountState.setDiscountValue}
              onPaymentMethodChange={setPaymentMethod}
              onCheckout={handleCheckout}
              onSplitPayment={handleSplitCheckout}
            />
          </>
        ) : (
          <div className="flex-1 p-5 overflow-hidden">
            <SaleHistoryPanel
              sales={sales}
              onViewInvoice={(sale) => {
                setCompletedSale(sale);
                setShowInvoice(true);
              }}
            />
          </div>
        )}
      </div>

      {/* Modals & Dialogs */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        total={totals.total}
        paymentMethod={paymentMethod}
        onMethodChange={setPaymentMethod}
        onConfirm={handleConfirmPayment}
        isLoading={isProcessing}
      />

      <SplitPaymentModal
        isOpen={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        total={totals.total}
        onConfirm={handleConfirmSplit}
        isLoading={isProcessing}
      />

      {showInvoice && completedSale && (
        <InvoicePrint
          sale={completedSale}
          pharmacyName={settings.pharmacyName}
          pharmacyAddress={settings.address}
          pharmacyPhone={settings.phone}
          onClose={() => {
            setShowInvoice(false);
            setCompletedSale(null);
          }}
        />
      )}

      <QuickAddCustomerModal
        isOpen={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onAdd={handleAddCustomer}
      />

      <HeldSalesDrawer
        heldSales={heldSales}
        isOpen={showHeldDrawer}
        onClose={() => setShowHeldDrawer(false)}
        onResume={resumeHeld}
        onDelete={deleteHeld}
      />

      <PINPadModal isOpen={showPIN} onClose={() => setShowPIN(false)} />

      <CashShiftModal
        isOpen={showShift}
        onClose={() => {
          setShowShift(false);
          cashShiftService
            .getCurrent()
            .then((s) => setHasOpenShift(!!s))
            .catch(() => {});
        }}
        mode={shiftMode}
      />

      <PrescriptionModal
        isOpen={showPrescriptionModal}
        onClose={() => setShowPrescriptionModal(false)}
        onSave={setPrescriptionData}
        initial={prescriptionData}
        hasRxItems={cart.some((i) => i.prescriptionRequired)}
      />

      <GenericSubstitutionModal
        isOpen={showGenericModal}
        onClose={() => setShowGenericModal(false)}
        sourceMedicine={genericSource}
        substitutes={
          genericSource
            ? medicines.filter(
                (m) =>
                  m.genericName === genericSource.genericName &&
                  m.id !== genericSource.id &&
                  m.stock > 0
              )
            : []
        }
        onSelect={(med) => {
          if (genericSource) removeFromCart(genericSource.id);
          addToCart(med);
          toastSuccess(`Switched to substitute: ${med.name}`);
        }}
      />
    </div>
  );
}
