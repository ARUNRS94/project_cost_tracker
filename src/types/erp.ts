/**
 * Project Code Tracker Data Models
 * Designed for auto-incrementing serial IDs in Supabase
 */

export type StatusActiveInactive = 'Active' | 'Inactive';
export type ProjectStatus = 'Planning' | 'Active' | 'Completed';
export type PaymentStatus = 'Paid' | 'Unpaid' | 'Partial';
export type PaymentMode = 'Cash' | 'Bank' | 'UPI';

// 1. Client Master
export interface ClientMaster {
  id: number;                 // Auto-increment primary key in Supabase
  client_name: string;        // Company / customer name
  contact_person: string;     // Contact name
  phone: string;              // Phone number
  email: string;              // Email
  address: string;            // Address
  gstin?: string;             // Optional GSTIN
  status: StatusActiveInactive;
}

// 2. Project Master
export interface ProjectMaster {
  id: number;                 // Auto-increment primary key in Supabase
  project_name: string;       // Project name
  client_id: number;          // Foreign key to Client Master id
  description: string;        // Project details
  start_date: string;         // Start date (YYYY-MM-DD)
  end_date: string;           // Expected completion (YYYY-MM-DD)
  approved_budget: number;    // Project budget
  pricing?: number;           // Pricing / Contract Value in INR (₹)
  status: ProjectStatus;      // Planning / Active / Completed
}

// 3. Item Type Master
export interface ItemTypeMaster {
  id: number;                 // Auto-increment primary key in Supabase
  description: string;        // Description / Category name
}

// 4. Item Master
export interface ItemMaster {
  id: number;                 // Auto-increment primary key in Supabase
  project_id?: number | null; // Optional project association for project-specific items
  item_name: string;          // Item Name
  item_type_id: number;       // Foreign key to Item Type id
  description: string;        // Description
  status: StatusActiveInactive;
  reference_picture: string;  // Reference Picture URL / Data URI
  work_location_picture: string; // Item Work Location Picture URL / Data URI
  item_size: string;          // Item Size
  default_rate: number;       // Default Rate
  remark: string;             // Remark
}

// 5. Expense Category Master
export interface ExpenseCategoryMaster {
  id: number;                 // Auto-increment primary key in Supabase
  category_name: string;      // Category Name (Labour / Material / Printing / etc.)
  description: string;        // Description
  status: StatusActiveInactive;
}

// 6. Vendor Master
export interface VendorMaster {
  id: number;                 // Auto-increment primary key in Supabase
  vendor_name: string;        // Vendor Name
  contact_person: string;     // Contact Person
  phone: string;              // Phone
  email: string;              // Email
  address: string;            // Address
  gstin: string;              // GSTIN
  vendor_type: string;        // Vendor Type
  status: StatusActiveInactive;
  remarks: string;            // Remarks
}

// 7. User Master
export interface UserMaster {
  id: number;                 // Auto-increment primary key in Supabase
  full_name: string;          // User name
  email: string;              // Email
  phone: string;              // Phone number
  designation: string;        // Job designation
  status: StatusActiveInactive;
  created_at: string;
  updated_at: string;
}

// 8. Role Master
export interface RoleMaster {
  id: number;                 // Auto-increment primary key in Supabase
  role_name: string;          // Admin, Manager, Accountant, Employee
  description: string;
  status: StatusActiveInactive;
  created_at: string;
}

// 9. User Role Mapping
export interface UserRoleMapping {
  id: number;                 // Auto-increment primary key in Supabase
  user_id: number;            // Foreign key to User id
  role_id: number;            // Foreign key to Role id
  assigned_by: number;        // Foreign key to User id
  created_at: string;
}

// 10. Expense Master
export interface ExpenseMaster {
  id: number;                 // Auto-increment primary key in Supabase
  project_id: number;         // Foreign key to Project id
  project_item_id?: number | null; // Optional item reference
  expense_date: string;       // Expense date (YYYY-MM-DD)
  expense_category_id: number;// Foreign key to Expense Category id
  description: string;        // Expense details
  vendor_id: number;          // Foreign key to Vendor id
  quantity?: number | null;
  unit?: string | null;
  rate?: number | null;
  amount: number;             // Expense amount
  payment_status: PaymentStatus; // Paid / Unpaid / Partial
  payment_mode: PaymentMode;  // Cash / Bank / UPI
  attachment: string;         // Bill / receipt URL or uploaded document
  reference_number: string;   // Invoice or transaction reference
  remarks: string;
  created_by: number;         // Foreign key to User id
}

// 11. Quotation Field Visibility Configuration
export interface QuotationFieldVisibility {
  showSerialNo: boolean;
  showItemName: boolean;
  showReferencePic: boolean;
  showWorkLocationPic: boolean;
  showItemSize: boolean;
  showQuantity: boolean;
  showUnit: boolean;
  showRate: boolean;
  showDiscount: boolean;
  showGst: boolean;
  showRemarks: boolean;
  showLineTotal: boolean;
}

// 12. Quotation Line Item
export interface QuotationLineItem {
  id: number;
  item_id?: number | null;
  description: string;
  reference_picture?: string;
  work_location_picture?: string;
  item_size?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount_percent: number;
  gst_percent: number;
  remarks?: string;
  amount: number;
}

// 13. Quotation Master
export interface QuotationMaster {
  id: number;
  quotation_number: string;
  quotation_date: string;
  valid_until: string;
  client_id?: number | null;
  client_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string;
  project_id?: number | null;
  project_name: string;
  field_visibility: QuotationFieldVisibility;
  items: QuotationLineItem[];
  subtotal: number;
  total_discount: number;
  total_gst: number;
  grand_total: number;
  payment_terms: string;
  bank_details: string;
  notes: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected';
  created_by: number;
  created_at: string;
}

export type ViewMode = 'grid' | 'list';
export type ThemeMode = 'dark' | 'light';

export type NavTab = 
  | 'dashboard'
  | 'expenses'
  | 'quotation'
  | 'masters'
  | 'team'
  | 'projects'
  | 'clients'
  | 'vendors'
  | 'items'
  | 'categories';

