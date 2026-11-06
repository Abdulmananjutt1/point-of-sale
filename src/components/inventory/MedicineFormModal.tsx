"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Medicine, Supplier } from "@/types";
import { MEDICINE_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type FormData = Omit<Medicine, "id" | "createdAt" | "updatedAt">;

const DEFAULT_FORM: FormData = {
  name: "",
  genericName: "",
  brand: "",
  category: "Tablet",
  barcode: "",
  batchNumber: "",
  expiryDate: "",
  purchasePrice: 0,
  sellingPrice: 0,
  stock: 0,
  minStock: 10,
  unit: "Strip",
  supplierId: "",
  requiresPrescription: false,
  description: "",
};

interface FormErrors {
  name?: string;
  genericName?: string;
  brand?: string;
  batchNumber?: string;
  expiryDate?: string;
  purchasePrice?: string;
  sellingPrice?: string;
  stock?: string;
}

interface MedicineFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  medicine?: Medicine | null; // null = add mode
  suppliers: Supplier[];
}

export default function MedicineFormModal({
  isOpen,
  onClose,
  onSubmit,
  medicine,
  suppliers,
}: MedicineFormModalProps) {
  const isEdit = !!medicine;
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      if (medicine) {
        const { id, createdAt, updatedAt, ...rest } = medicine;
        void id; void createdAt; void updatedAt;
        setForm(rest);
      } else {
        setForm(DEFAULT_FORM);
      }
      setErrors({});
    }
  }, [isOpen, medicine]);

  const set = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.genericName.trim()) e.genericName = "Required";
    if (!form.brand.trim()) e.brand = "Required";
    if (!form.batchNumber.trim()) e.batchNumber = "Required";
    if (!form.expiryDate) e.expiryDate = "Required";
    if (form.purchasePrice <= 0) e.purchasePrice = "Must be greater than 0";
    if (form.sellingPrice <= 0) e.sellingPrice = "Must be greater than 0";
    if (form.sellingPrice < form.purchasePrice)
      e.sellingPrice = "Should not be less than purchase price";
    if (form.stock < 0) e.stock = "Cannot be negative";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  };

  const selectClass = cn(
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Medicine" : "Add New Medicine"}
      size="xl"
    >
      <form onSubmit={handleSubmit} noValidate>
        {/* ── Section: Basic Info ─────────────────────────── */}
        <SectionLabel>Basic Information</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <Input
            id="med-name"
            label="Medicine Name *"
            placeholder="e.g. Panadol Extra"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            error={errors.name}
          />
          <Input
            id="med-generic"
            label="Generic Name *"
            placeholder="e.g. Paracetamol 500mg"
            value={form.genericName}
            onChange={(e) => set("genericName", e.target.value)}
            error={errors.genericName}
          />
          <Input
            id="med-brand"
            label="Brand *"
            placeholder="e.g. GSK"
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
            error={errors.brand}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Category *
            </label>
            <select
              value={form.category}
              onChange={(e) =>
                set("category", e.target.value as Medicine["category"])
              }
              className={selectClass}
            >
              {MEDICINE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Unit</label>
            <select
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
              className={selectClass}
            >
              {["Strip", "Bottle", "Box", "Vial", "Sachet", "Tube", "Piece"].map(
                (u) => (
                  <option key={u}>{u}</option>
                )
              )}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Supplier</label>
            <select
              value={form.supplierId}
              onChange={(e) => set("supplierId", e.target.value)}
              className={selectClass}
            >
              <option value="">— Select Supplier —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Section: Batch & Expiry ─────────────────────── */}
        <SectionLabel>Batch, Barcode & Expiry</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <Input
            id="med-batch"
            label="Batch Number *"
            placeholder="e.g. BN2024001"
            value={form.batchNumber}
            onChange={(e) => set("batchNumber", e.target.value)}
            error={errors.batchNumber}
          />
          <Input
            id="med-barcode"
            label="Barcode (EAN / UPC)"
            placeholder="Scan or type barcode…"
            value={form.barcode ?? ""}
            onChange={(e) => set("barcode", e.target.value || undefined)}
          />
          <Input
            id="med-expiry"
            label="Expiry Date *"
            type="date"
            value={form.expiryDate}
            onChange={(e) => set("expiryDate", e.target.value)}
            error={errors.expiryDate}
          />
        </div>

        {/* ── Section: Pricing ────────────────────────────── */}
        <SectionLabel>Pricing (PKR)</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <Input
            id="med-purchase"
            label="Purchase Price *"
            type="number"
            min={0}
            step={0.01}
            value={form.purchasePrice || ""}
            onChange={(e) => set("purchasePrice", Number(e.target.value))}
            error={errors.purchasePrice}
            placeholder="0"
          />
          <Input
            id="med-selling"
            label="Selling Price *"
            type="number"
            min={0}
            step={0.01}
            value={form.sellingPrice || ""}
            onChange={(e) => set("sellingPrice", Number(e.target.value))}
            error={errors.sellingPrice}
            placeholder="0"
          />
        </div>

        {/* ── Section: Stock ──────────────────────────────── */}
        <SectionLabel>Stock</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <Input
            id="med-stock"
            label={isEdit ? "Current Stock" : "Opening Stock"}
            type="number"
            min={0}
            value={form.stock || ""}
            onChange={(e) => set("stock", Number(e.target.value))}
            error={errors.stock}
            placeholder="0"
          />
          <Input
            id="med-min"
            label="Minimum Stock (Alert Threshold)"
            type="number"
            min={0}
            value={form.minStock || ""}
            onChange={(e) => set("minStock", Number(e.target.value))}
            placeholder="10"
          />
        </div>

        {/* ── Prescription checkbox ──────────────────────── */}
        <div className="flex items-center gap-2.5 mb-6">
          <input
            id="med-rx"
            type="checkbox"
            checked={form.requiresPrescription}
            onChange={(e) => set("requiresPrescription", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 accent-blue-600"
          />
          <label htmlFor="med-rx" className="text-sm text-gray-700 cursor-pointer">
            Requires prescription (Rx)
          </label>
        </div>

        {/* ── Actions ─────────────────────────────────────── */}
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button
            variant="outline"
            type="button"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            {isEdit ? "Save Changes" : "Add Medicine"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}
