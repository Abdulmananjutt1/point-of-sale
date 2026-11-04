"use client";

import { useState, useMemo } from "react";
import {
  Search,
  X,
  Sparkles,
  Layers,
  LayoutGrid,
  List,
  Pill,
  Droplet,
  Syringe,
  Package,
  Check,
  Plus,
  MapPin,
  ArrowUpDown,
  Filter,
  RefreshCw,
  AlertTriangle,
  FileText,
  Boxes,
} from "lucide-react";
import { Medicine } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { MEDICINE_CATEGORIES } from "@/lib/constants";

interface MedicineGridProps {
  medicines: Medicine[];
  search: string;
  onSearchChange: (val: string) => void;
  onSelect: (medicine: Medicine) => void;
  cart?: { medicineId: string; quantity: number }[];
  onOpenGenericModal?: (medicine: Medicine) => void;
}

type ViewMode = "grid" | "list";
type SortOption = "name" | "price-asc" | "price-desc" | "stock-desc";

export default function MedicineGrid({
  medicines,
  search,
  onSearchChange,
  onSelect,
  cart = [],
  onOpenGenericModal,
}: MedicineGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>("name");

  // Create quick lookup for cart quantities
  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart) {
      map.set(item.medicineId, (map.get(item.medicineId) || 0) + item.quantity);
    }
    return map;
  }, [cart]);

  // Filter & sort medicines
  const filteredAndSorted = useMemo(() => {
    const q = search.toLowerCase().trim();

    const filtered = medicines.filter((m) => {
      // Stock filter
      if (onlyInStock && m.stock <= 0) return false;

      // Category filter
      if (selectedCategory !== "All" && m.category !== selectedCategory) {
        return false;
      }

      // Search match
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        (m.brand && m.brand.toLowerCase().includes(q)) ||
        (m.batchNumber && m.batchNumber.toLowerCase().includes(q)) ||
        (m.shelfLocation && m.shelfLocation.toLowerCase().includes(q)) ||
        (m.strength && m.strength.toLowerCase().includes(q))
      );
    });

    // Sorting
    return filtered.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "price-asc") {
        return a.sellingPrice - b.sellingPrice;
      }
      if (sortBy === "price-desc") {
        return b.sellingPrice - a.sellingPrice;
      }
      if (sortBy === "stock-desc") {
        return b.stock - a.stock;
      }
      return 0;
    });
  }, [medicines, search, selectedCategory, onlyInStock, sortBy]);

  return (
    <div className="flex flex-col gap-2.5 h-full overflow-hidden">
      {/* Top Controls Toolbar: Category Pills + Filter Toggles + View Switcher */}
      <div className="flex flex-col gap-2 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex-shrink-0">
        {/* Category Pills Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("All")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
              selectedCategory === "All"
                ? "bg-[var(--theme-500,#2563eb)] text-white border-[var(--theme-500,#2563eb)] shadow-xs"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70"
            )}
          >
            <Boxes size={13} className={selectedCategory === "All" ? "text-emerald-400" : "text-slate-400"} />
            <span>All Products</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                selectedCategory === "All" ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-600"
              )}
            >
              {medicines.length}
            </span>
          </button>

          {MEDICINE_CATEGORIES.map((cat) => {
            const count = medicines.filter((m) => m.category === cat).length;
            if (count === 0) return null;
            const isSelected = selectedCategory === cat;
            const meta = getCategoryMeta(cat);
            const Icon = meta.icon;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
                  isSelected
                    ? meta.pillActive
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <Icon size={13} className={isSelected ? "text-white" : "text-slate-400"} />
                <span>{cat}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-bar: Filters, Sort, and View Modes */}
        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 gap-2">
          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyInStock((prev) => !prev)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer",
                onlyInStock
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-500/20"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  onlyInStock ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                )}
              />
              <span>In Stock Only</span>
            </button>

            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Showing <strong className="text-slate-700">{filteredAndSorted.length}</strong> of {medicines.length}
            </span>
          </div>

          {/* Sort & View Toggle */}
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600">
              <ArrowUpDown size={12} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort medicines by"
                className="bg-transparent text-[11px] font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="name">Name (A-Z)</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="stock-desc">Highest Stock</option>
              </select>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode("grid")}
                title="Grid Card View"
                className={cn(
                  "p-1 rounded-md transition-all cursor-pointer",
                  viewMode === "grid"
                    ? "bg-white text-emerald-600 shadow-xs font-semibold"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="Dense Table View"
                className={cn(
                  "p-1 rounded-md transition-all cursor-pointer",
                  viewMode === "list"
                    ? "bg-white text-emerald-600 shadow-xs font-semibold"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container: Grid or Table View */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredAndSorted.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Search size={24} strokeWidth={1.75} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No medicines found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {search
                ? `No results match "${search}". Check for typos or search by generic formula.`
                : "No items match your active filters (Category or In-Stock toggle)."}
            </p>
            {(search || selectedCategory !== "All" || onlyInStock) && (
              <button
                onClick={() => {
                  onSearchChange("");
                  setSelectedCategory("All");
                  setOnlyInStock(false);
                }}
                className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw size={13} />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Modern Card Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {filteredAndSorted.map((med) => {
              const inCartQty = cartQtyMap.get(med.id) || 0;
              return (
                <MedicineCard
                  key={med.id}
                  medicine={med}
                  inCartQty={inCartQty}
                  onSelect={onSelect}
                  onOpenGenericModal={onOpenGenericModal}
                />
              );
            })}
          </div>
        ) : (
          /* Dense Table / List View */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0 z-10 backdrop-blur-xs">
                <tr>
                  <th className="py-2.5 px-3">Medicine & Formula</th>
                  <th className="py-2.5 px-2">Category</th>
                  <th className="py-2.5 px-2">Shelf / Rack</th>
                  <th className="py-2.5 px-2">Stock</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSorted.map((med) => {
                  const inCartQty = cartQtyMap.get(med.id) || 0;
                  const isOut = med.stock === 0;
                  const isLow = !isOut && med.stock <= (med.minStock || 10);
                  const meta = getCategoryMeta(med.category);
                  const Icon = meta.icon;

                  return (
                    <tr
                      key={med.id}
                      onClick={() => !isOut && onSelect(med)}
                      className={cn(
                        "group transition-colors duration-100 cursor-pointer",
                        inCartQty > 0
                          ? "bg-emerald-50/50 hover:bg-emerald-50/80"
                          : isOut
                          ? "bg-slate-50/60 opacity-60 hover:bg-slate-100/50 cursor-not-allowed"
                          : "hover:bg-slate-50/90"
                      )}
                    >
                      {/* Name & Formula */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-start gap-2">
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border",
                              meta.color
                            )}
                          >
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                {med.name}
                              </span>
                              {med.strength && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-medium">
                                  {med.strength}
                                </span>
                              )}
                              {med.requiresPrescription && (
                                <span className="text-[9px] font-black text-violet-700 bg-violet-100 px-1 py-0.2 rounded border border-violet-200">
                                  Rx
                                </span>
                              )}
                              {inCartQty > 0 && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                                  <Check size={10} strokeWidth={2.5} /> {inCartQty} in cart
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {med.genericName}
                              {med.brand && <span className="text-slate-300 mx-1">•</span>}
                              {med.brand}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-2">
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                          {med.category}
                        </span>
                      </td>

                      {/* Shelf / Rack */}
                      <td className="py-2.5 px-2">
                        {med.shelfLocation ? (
                          <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 whitespace-nowrap">
                            <MapPin size={11} className="text-slate-400" />
                            {med.shelfLocation}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Stock Status */}
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              isOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-emerald-500"
                            )}
                          />
                          <span
                            className={cn(
                              "font-semibold text-[11px]",
                              isOut ? "text-red-600" : isLow ? "text-amber-700" : "text-emerald-700"
                            )}
                          >
                            {isOut ? "Out of stock" : `${med.stock} ${med.unit || "unit"}`}
                          </span>
                        </div>
                      </td>

                      {/* Selling Price */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="font-bold text-slate-900 text-sm">
                          {formatCurrency(med.sellingPrice)}
                        </div>
                        <span className="text-[10px] text-slate-400">/{med.unit || "unit"}</span>
                      </td>

                      {/* Action Button */}
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {isOut ? (
                          onOpenGenericModal ? (
                            <button
                              onClick={() => onOpenGenericModal(med)}
                              className="px-2 py-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all cursor-pointer whitespace-nowrap"
                            >
                              Alt Generic
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Unavailable</span>
                          )
                        ) : (
                          <button
                            onClick={() => onSelect(med)}
                            className={cn(
                              "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer",
                              inCartQty > 0
                                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                                : "bg-[var(--theme-500,#2563eb)] text-white hover:bg-[var(--theme-600,#1d4ed8)] shadow-xs"
                            )}
                          >
                            <Plus size={12} strokeWidth={2.5} />
                            <span>{inCartQty > 0 ? "Add +" : "Add"}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid Card Component
// ─────────────────────────────────────────────────────────────────────────────
interface MedicineCardProps {
  medicine: Medicine;
  inCartQty: number;
  onSelect: (medicine: Medicine) => void;
  onOpenGenericModal?: (medicine: Medicine) => void;
}

function MedicineCard({
  medicine: med,
  inCartQty,
  onSelect,
  onOpenGenericModal,
}: MedicineCardProps) {
  const isOut = med.stock === 0;
  const isLow = !isOut && med.stock <= (med.minStock || 10);
  const meta = getCategoryMeta(med.category);
  const Icon = meta.icon;

  return (
    <div
      onClick={() => !isOut && onSelect(med)}
      className={cn(
        "group relative bg-white border rounded-2xl p-3 text-left transition-all duration-150 flex flex-col justify-between select-none",
        isOut
          ? "opacity-60 border-slate-200 bg-slate-50/50 cursor-not-allowed"
          : inCartQty > 0
          ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10 hover:shadow-md cursor-pointer"
          : "border-slate-200/90 hover:border-emerald-500 hover:shadow-md cursor-pointer hover:-translate-y-0.5 shadow-2xs"
      )}
    >
      <div>
        {/* Card Header: Category + Badges */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border",
                meta.color
              )}
            >
              <Icon size={11} />
              <span>{med.category}</span>
            </span>

            {med.requiresPrescription && (
              <span className="text-[10px] font-black text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded border border-violet-200">
                Rx
              </span>
            )}
          </div>

          {/* In Cart Indicator */}
          {inCartQty > 0 && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <Check size={10} strokeWidth={2.5} />
              <span>{inCartQty} in cart</span>
            </span>
          )}
        </div>

        {/* Medicine Name & Strength */}
        <div className="mb-1">
          <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug line-clamp-1">
            {med.name}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
            {med.strength && (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                {med.strength}
              </span>
            )}
            <span className="truncate text-slate-400 text-[11px]">{med.genericName}</span>
          </div>
        </div>

        {/* Shelf / Rack Location */}
        {med.shelfLocation && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 mt-1.5">
            <MapPin size={11} className="text-slate-400" />
            <span className="text-slate-600 font-semibold">{med.shelfLocation}</span>
          </div>
        )}
      </div>

      {/* Card Footer: Stock Level + Price + Quick Add Button */}
      <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex flex-col gap-2">
        {/* Stock status indicator */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                isOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-emerald-500"
              )}
            />
            <span
              className={cn(
                "font-semibold text-[11px]",
                isOut ? "text-red-600" : isLow ? "text-amber-700" : "text-emerald-700"
              )}
            >
              {isOut ? "Out of stock" : `${med.stock} ${med.unit || "unit"}s left`}
            </span>
          </div>

          <span className="text-[10px] text-slate-400">
            {med.brand || ""}
          </span>
        </div>

        {/* Price & Action Row */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div>
            <span className="text-sm font-black text-slate-900">
              {formatCurrency(med.sellingPrice)}
            </span>
            <span className="text-[10px] text-slate-400 ml-1">
              /{med.unit || "unit"}
            </span>
          </div>

          {/* Add / Alt Button */}
          {isOut ? (
            onOpenGenericModal ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenGenericModal(med);
                }}
                className="px-2 py-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all cursor-pointer flex items-center gap-1"
              >
                <RefreshCw size={10} />
                <span>Alt</span>
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 italic">Out</span>
            )
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(med);
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                inCartQty > 0
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                  : "bg-[var(--theme-500,#2563eb)] text-white hover:bg-[var(--theme-600,#1d4ed8)] shadow-xs"
              )}
            >
              <Plus size={12} strokeWidth={2.5} />
              <span>{inCartQty > 0 ? "Add +" : "Add"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper function for category styling and icons
// ─────────────────────────────────────────────────────────────────────────────
function getCategoryMeta(category: string) {
  switch (category) {
    case "Tablet":
      return {
        icon: Pill,
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
        pillActive: "bg-emerald-600 text-white border-emerald-600 shadow-xs",
      };
    case "Capsule":
      return {
        icon: Pill,
        color: "text-blue-700 bg-blue-50 border-blue-200",
        pillActive: "bg-blue-600 text-white border-blue-600 shadow-xs",
      };
    case "Syrup":
      return {
        icon: Droplet,
        color: "text-amber-700 bg-amber-50 border-amber-200",
        pillActive: "bg-amber-600 text-white border-amber-600 shadow-xs",
      };
    case "Injection":
      return {
        icon: Syringe,
        color: "text-purple-700 bg-purple-50 border-purple-200",
        pillActive: "bg-purple-600 text-white border-purple-600 shadow-xs",
      };
    case "Cream":
      return {
        icon: Sparkles,
        color: "text-rose-700 bg-rose-50 border-rose-200",
        pillActive: "bg-rose-600 text-white border-rose-600 shadow-xs",
      };
    case "Drops":
      return {
        icon: Droplet,
        color: "text-cyan-700 bg-cyan-50 border-cyan-200",
        pillActive: "bg-cyan-600 text-white border-cyan-600 shadow-xs",
      };
    case "Inhaler":
      return {
        icon: Layers,
        color: "text-teal-700 bg-teal-50 border-teal-200",
        pillActive: "bg-teal-600 text-white border-teal-600 shadow-xs",
      };
    case "Supplement":
      return {
        icon: Sparkles,
        color: "text-orange-700 bg-orange-50 border-orange-200",
        pillActive: "bg-orange-600 text-white border-orange-600 shadow-xs",
      };
    default:
      return {
        icon: Package,
        color: "text-slate-700 bg-slate-100 border-slate-200",
        pillActive: "bg-slate-800 text-white border-slate-800 shadow-xs",
      };
  }
}
