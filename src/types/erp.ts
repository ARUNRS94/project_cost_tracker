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

export type NavTab = 
  | 'dashboard'
  | 'expenses'
  | 'projects'
  | 'clients'
  | 'vendors'
  | 'items'
  | 'categories'
  | 'team';
