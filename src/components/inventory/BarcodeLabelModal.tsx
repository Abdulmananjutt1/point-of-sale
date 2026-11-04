"use client";

import { useState } from "react";
import { Printer, Barcode, Search, Check, Minus, Plus, Package } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Medicine } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface BarcodeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicines: Medicine[];
}

export default function BarcodeLabelModal({ isOpen, onClose, medicines }: BarcodeLabelModalProps) {
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  const filtered = medicines.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.genericName.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev[id]) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: 1 };
    });
  };

  const setQty = (id: string, qty: number) => setSelected((prev) => ({ ...prev, [id]: Math.max(1, qty) }));

  const selectedList = Object.entries(selected)
    .map(([id, qty]) => ({ med: medicines.find((m) => m.id === id)!, qty }))
    .filter((e) => e.med);

  const totalLabels = selectedList.reduce((s, e) => s + e.qty, 0);

  const handlePrint = () => {
    const labels = selectedList.flatMap(({ med, qty }) =>
      Array.from({ length: qty }).map(() => {
        const barcodeId = med.id.slice(0, 12);
        return `
          <div style="width: 2.5in; height: 1.5in; border: 1px solid #000; padding: 0.08in; margin: 0.1in; display: inline-block; font-family: 'Arial', sans-serif; box-sizing: border-box; page-break-inside: avoid;">
            <div style="font-size: 9pt; font-weight: bold; line-height: 1.2; margin-bottom: 0.05in; text-align: left;">${med.name}</div>
            <div style="font-size: 7pt; color: #333; line-height: 1; margin-bottom: 0.05in; text-align: left;">${med.genericName}</div>
            <div style="font-size: 16pt; text-align: center; font-family: 'Courier New', monospace; font-weight: bold; letter-spacing: -1px; margin: 0.05in 0; line-height: 1;">*${barcodeId}*</div>
            <div style="font-size: 6.5pt; text-align: center; font-family: monospace; letter-spacing: 2px; margin-bottom: 0.04in;">${barcodeId}</div>
            <div style="display: flex; justify-content: space-between; font-size: 7pt; font-weight: bold;">
              <span>${formatCurrency(med.sellingPrice)}</span>
              <span>${med.expiryDate.split("T")[0]}</span>
            </div>
          </div>
        `;
      })
    ).join("");

    const win = window.open("", "_blank");
    if (!win) return;

    const css = `
      @page { size: 2.5in 1.5in; margin: 0; }
      body { margin: 0; padding: 0; background: white; font-family: Arial, sans-serif; }
      @media print { body { margin: 0; padding: 0; } }
    `;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Pharmacy Labels</title>
          <style>${css}</style>
        </head>
        <body>${labels}</body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Print Barcode Labels" size="xl">
      <div className="flex gap-6" style={{ minHeight: "600px" }}>
        
        {/* LEFT PANEL - Medicine Selection */}
        <div className="flex-1 flex flex-col border-r border-gray-200 pr-6">
          {/* Header */}
          <div className="mb-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Select Medicines</h3>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search by name or brand..."
                className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
          </div>

          {/* Medicine List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Package size={32} className="mb-2 opacity-40" />
                <p className="text-sm font-medium">No medicines found</p>
              </div>
            ) : (
              filtered.map((med) => (
                <div
                  key={med.id}
                  onClick={() => toggle(med.id)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all group ${
                    selected[med.id]
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                      selected[med.id] 
                        ? "bg-blue-500 border-blue-500 shadow-md shadow-blue-200" 
                        : "border-gray-300 group-hover:border-blue-400"
                    }`}>
                      {selected[med.id] && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{med.name}</p>
                      <p className="text-xs text-gray-500 truncate">{med.genericName}</p>
                    </div>
                    
                    {/* Price + Selected Badge */}
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">{formatCurrency(med.sellingPrice)}</p>
                      {selected[med.id] && (
                        <span className="inline-block text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-lg mt-1">
                          {selected[med.id]}x
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Selection count footer */}
          {selectedList.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Selected:</p>
              <p className="text-lg font-bold text-blue-600">{selectedList.length} medicines</p>
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Preview & Details */}
        <div className="w-80 flex flex-col">
          
          {/* Preview Header */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Barcode size={18} className="text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">Label Preview</h3>
            </div>
          </div>

          {selectedList.length === 0 ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 p-4 text-center">
              <Barcode size={48} className="text-gray-300 mb-3" strokeWidth={1} />
              <p className="text-sm font-semibold text-gray-600">No medicines selected</p>
              <p className="text-xs text-gray-500 mt-1">Choose medicines from the left to start</p>
            </div>
          ) : (
            <>
              {/* Preview Cards */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {selectedList.map(({ med, qty }) => (
                  <div key={med.id} className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                    {/* Medicine name */}
                    <p className="text-xs font-bold text-gray-900 truncate mb-1">{med.name}</p>
                    
                    {/* Mini barcode preview */}
                    <div className="flex items-center justify-center bg-white border border-gray-300 rounded-lg p-2 mb-2 text-center">
                      <span style={{ fontFamily: "monospace", fontSize: "11px", letterSpacing: "-1px", fontWeight: "bold" }}>
                        *{med.id.slice(0, 10)}*
                      </span>
                    </div>
                    
                    {/* Info row */}
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-gray-600">{formatCurrency(med.sellingPrice)}</span>
                      <span className="text-gray-600">{med.expiryDate.split("T")[0]}</span>
                    </div>

                    {/* Quantity control */}
                    <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200">
                      <span className="text-xs font-semibold text-gray-700 flex-1">Qty:</span>
                      <button
                        onClick={() => setQty(med.id, qty - 1)}
                        className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-blue-100 flex items-center justify-center transition-colors text-gray-600 hover:text-blue-600"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center font-bold text-blue-600">{qty}</span>
                      <button
                        onClick={() => setQty(med.id, qty + 1)}
                        className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-blue-100 flex items-center justify-center transition-colors text-gray-600 hover:text-blue-600"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Summary Box */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white shadow-lg">
                <p className="text-xs font-semibold opacity-90 mb-1">Total Labels to Print</p>
                <p className="text-3xl font-bold">{totalLabels}</p>
                <p className="text-xs opacity-75 mt-1">{selectedList.length} {selectedList.length === 1 ? "medicine" : "medicines"}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
        <Button 
          variant="outline" 
          className="flex-1" 
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 gap-2 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow"
          onClick={handlePrint}
          disabled={selectedList.length === 0}
        >
          <Printer size={18} />
          Print {totalLabels} Label{totalLabels !== 1 ? "s" : ""}
        </Button>
      </div>
    </Modal>
  );
}
