// ─── Medicine / Product ───────────────────────────────────────────────────────
export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  brand: string;
  category: MedicineCategory;
  batchNumber: string;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
  mrp?: number;
  tradePrice?: number;
  taxRate?: number;
  defaultDiscount?: number;
  strength?: string;
  packSize?: string;
  form?: string;
  shelfLocation?: string;
  stock: number;
  minStock: number;
  maxStock?: number;
  unit: string;
  supplierId: string;
  description?: string;
  requiresPrescription: boolean;
  isControlled?: boolean;
  isColdChain?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MedicineCategory =
  | "Tablet"
  | "Capsule"
  | "Syrup"
  | "Injection"
  | "Cream"
  | "Drops"
  | "Inhaler"
  | "Supplement"
  | "Other";

// ─── Medicine Batch ───────────────────────────────────────────────────────────
export interface MedicineBatch {
  id: string;
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  supplierId?: string;
  createdAt: string;
}

// ─── Customer ─────────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  creditBalance?: number;
  totalPurchases: number;
  createdAt: string;
}

// ─── Supplier ─────────────────────────────────────────────────────────────────
export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address: string;
  createdAt: string;
}

// ─── Sale / Invoice ───────────────────────────────────────────────────────────
export interface SaleItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  batchId?: string;
  expiryDate?: string;
  prescriptionRequired?: boolean;
  prescriptionImageUrl?: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  splitPayments?: SplitPaymentEntry[];
  status: SaleStatus;
  isCredit?: boolean;
  doctorName?: string;
  patientName?: string;
  prescriptionNote?: string;
  cashierName: string;
  shiftId?: string;
  createdAt: string;
}

export type PaymentMethod = "Cash" | "Card" | "UBL" | "JazzCash" | "EasyPaisa" | "Credit";
export type SaleStatus = "Completed" | "Pending" | "Refunded" | "Held";

// ─── Split Payment ────────────────────────────────────────────────────────────
export interface SplitPaymentEntry {
  method: PaymentMethod;
  amount: number;
}

// ─── Held Sale ────────────────────────────────────────────────────────────────
export interface HeldSale {
  id: string;
  label: string;
  cart: SaleItem[];
  customerId?: string;
  customerName: string;
  discount: number;
  heldAt: string;
}

// ─── Return / Refund ─────────────────────────────────────────────────────────
export type ReturnReason = "Defective" | "Expired" | "Wrong Item" | "Customer Request" | "Other";
export type ReturnCondition = "Good" | "Opened" | "Damaged" | "Expired";
export type ReturnStatus = "Approved" | "Rejected" | "Partial";

export interface ReturnItem {
  medicineId: string;
  medicineName: string;
  saleQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  reason: ReturnReason;
  condition: ReturnCondition;
}

export interface SaleReturn {
  id: string;
  returnNumber: string;
  saleId: string;
  invoiceNumber: string;
  returnDate: string;
  items: ReturnItem[];
  reason: string;
  notes?: string;
  refundAmount: number;
  refundMethod: PaymentMethod;
  status: ReturnStatus;
  createdAt: string;
}

// ─── Purchase Order ───────────────────────────────────────────────────────────
export type POStatus = "Draft" | "Sent" | "Confirmed" | "PartiallyReceived" | "Received" | "Cancelled";

export interface PurchaseOrderItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
  total: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  poDate: string;
  expectedDeliveryDate?: string;
  status: POStatus;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Stock Transfer ───────────────────────────────────────────────────────────
export type TransferStatus = "Pending" | "InTransit" | "Received" | "Returned" | "PaidCash" | "Rejected";
export type TransferType   = "Internal" | "ExternalOut" | "ExternalIn";

export interface StockTransferItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  transferType: TransferType;
  fromBranch: string;
  toBranch: string;
  externalPharmacy?: string;
  externalPhone?: string;
  contactPerson?: string;
  settlementType?: "StockReturn" | "Cash" | "Pending";
  settledAmount?: number;
  items: StockTransferItem[];
  transferDate: string;
  receiveDate?: string;
  settledDate?: string;
  status: TransferStatus;
  notes?: string;
  initiatedBy: string;
  createdAt: string;
}

// ─── Stock Count ──────────────────────────────────────────────────────────────
export type StockCountStatus = "Draft" | "InProgress" | "Completed" | "Verified";

export interface StockCountItem {
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  systemStock: number;
  physicalCount: number | null;
  variance: number;
}

export interface StockCount {
  id: string;
  countNumber: string;
  countDate: string;
  status: StockCountStatus;
  items: StockCountItem[];
  notes?: string;
  createdAt: string;
}

// ─── Cash Drawer Shift ────────────────────────────────────────────────────────
export type ShiftStatus = "Open" | "Closed";

export interface ShiftEntry {
  description: string;
  amount: number;
  type: "in" | "out";
  time: string;
}

export interface CashShift {
  id: string;
  shiftNumber: string;
  openedBy: string;
  closedBy?: string;
  openTime: string;
  closeTime?: string;
  openingBalance: number;
  closingBalance?: number;
  expectedCash?: number;
  variance?: number;
  cashEntries: ShiftEntry[];
  status: ShiftStatus;
  notes?: string;
}

// ─── User & Auth ──────────────────────────────────────────────────────────────
export type UserRole = "Admin" | "Manager" | "Cashier" | "Pharmacist";

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  pin?: string; // 4-digit PIN hash
  isActive: boolean;
  branch?: string;
  createdAt: string;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  action: "Login" | "Logout" | "PIN Switch" | "Session Timeout" | "Force Logout";
  time: string;
  ipAddress?: string;
}

// ─── Expense ──────────────────────────────────────────────────────────────────
export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  shiftId?: string;
  createdAt: string;
}

// ─── Theme ────────────────────────────────────────────────────────────────────
export type ThemeColor = "blue" | "purple" | "green" | "rose" | "orange" | "teal" | "black" | "white" | "indigo" | "cyan";

// ─── App Settings ─────────────────────────────────────────────────────────────
export interface AppSettings {
  pharmacyName: string;
  address: string;
  phone: string;
  licenseNumber?: string;
  taxNumber?: string;
  footerText?: string;
  logoUrl?: string;
  taxRate: number;
  invoicePrefix: string;
  currency: string;
  lowStockThreshold: number;
  expiryWarnDays: number;
  receiptTemplate: "thermal" | "a4";
  allowLineDiscount: boolean;
  allowBillDiscount: boolean;
  allowSplitPayment: boolean;
  allowHoldSale: boolean;
  allowCreditSales: boolean;
  requireRxUpload: boolean;
  autoLogoutMinutes: number;
  themeColor: ThemeColor;
  branches: string[];
  currentBranch: string;
}

// ─── Branch ───────────────────────────────────────────────────────────────────
export interface Branch {
  id: string;
  name: string;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export interface DashboardStats {
  todaySales: number;
  todayRevenue: number;
  totalMedicines: number;
  lowStockItems: number;
  expiringItems: number;
  totalCustomers: number;
}

// ─── Table Column ─────────────────────────────────────────────────────────────
export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}
