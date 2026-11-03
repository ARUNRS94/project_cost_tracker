import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  ClientMaster,
  ProjectMaster,
  ItemTypeMaster,
  ItemMaster,
  ExpenseCategoryMaster,
  VendorMaster,
  UserMaster,
  RoleMaster,
  UserRoleMapping,
  ExpenseMaster,
  NavTab,
} from '../types/erp';
import {
  initialClients,
  initialProjects,
  initialItemTypes,
  initialItems,
  initialExpenseCategories,
  initialVendors,
  initialUsers,
  initialRoles,
  initialUserRoleMappings,
  initialExpenses,
} from '../data/seedData';

interface ERPContextType {
  // Navigation & Preferences
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currency: string;
  setCurrency: (c: string) => void;
  currentUser: UserMaster;
  setCurrentUser: (user: UserMaster) => void;

  // Master Data
  clients: ClientMaster[];
  projects: ProjectMaster[];
  itemTypes: ItemTypeMaster[];
  items: ItemMaster[];
  expenseCategories: ExpenseCategoryMaster[];
  vendors: VendorMaster[];
  users: UserMaster[];
  roles: RoleMaster[];
  userRoles: UserRoleMapping[];
  expenses: ExpenseMaster[];

  // Client CRUD (Auto-increment ID)
  addClient: (client: Omit<ClientMaster, 'id'>) => ClientMaster;
  updateClient: (client: ClientMaster) => void;
  deleteClient: (clientId: number) => void;

  // Project CRUD (Auto-increment ID)
  addProject: (project: Omit<ProjectMaster, 'id'>) => ProjectMaster;
  updateProject: (project: ProjectMaster) => void;
  deleteProject: (projectId: number) => void;

  // Item Type CRUD (Auto-increment ID)
  addItemType: (itemType: Omit<ItemTypeMaster, 'id'>) => ItemTypeMaster;
  updateItemType: (itemType: ItemTypeMaster) => void;
  deleteItemType: (itemTypeId: number) => void;

  // Item CRUD (Auto-increment ID)
  addItem: (item: Omit<ItemMaster, 'id'>) => ItemMaster;
  updateItem: (item: ItemMaster) => void;
  deleteItem: (itemId: number) => void;

  // Expense Category CRUD (Auto-increment ID)
  addExpenseCategory: (cat: Omit<ExpenseCategoryMaster, 'id'>) => ExpenseCategoryMaster;
  updateExpenseCategory: (cat: ExpenseCategoryMaster) => void;
  deleteExpenseCategory: (catId: number) => void;

  // Vendor CRUD (Auto-increment ID)
  addVendor: (vendor: Omit<VendorMaster, 'id'>) => VendorMaster;
  updateVendor: (vendor: VendorMaster) => void;
  deleteVendor: (vendorId: number) => void;

  // User CRUD (Auto-increment ID)
  addUser: (user: Omit<UserMaster, 'id'>) => UserMaster;
  updateUser: (user: UserMaster) => void;
  deleteUser: (userId: number) => void;

  // Role CRUD (Auto-increment ID)
  addRole: (role: Omit<RoleMaster, 'id'>) => RoleMaster;
  updateRole: (role: RoleMaster) => void;
  deleteRole: (roleId: number) => void;

  // User Role Mapping CRUD (Auto-increment ID)
  assignUserRole: (userId: number, roleId: number) => void;
  removeUserRole: (mappingId: number) => void;

  // Expense CRUD (Auto-increment ID)
  addExpense: (expense: Omit<ExpenseMaster, 'id'>) => ExpenseMaster;
  updateExpense: (expense: ExpenseMaster) => void;
  deleteExpense: (expenseId: number) => void;

  // Relational Lookups & Computations
  getClient: (id?: number) => ClientMaster | undefined;
  getProject: (id?: number) => ProjectMaster | undefined;
  getItemType: (id?: number) => ItemTypeMaster | undefined;
  getItem: (id?: number) => ItemMaster | undefined;
  getExpenseCategory: (id?: number) => ExpenseCategoryMaster | undefined;
  getVendor: (id?: number) => VendorMaster | undefined;
  getUser: (id?: number) => UserMaster | undefined;
  getRole: (id?: number) => RoleMaster | undefined;
  getUserRoles: (userId: number) => RoleMaster[];
  getProjectExpenses: (projectId: number) => ExpenseMaster[];
  getProjectSpent: (projectId: number) => number;
  getVendorSpent: (vendorId: number) => { total: number; paid: number; unpaid: number };

  // Data Actions
  resetToSampleData: () => void;
  exportDatabaseJSON: () => string;
  importDatabaseJSON: (jsonStr: string) => boolean;
}

const STORAGE_KEY = 'PROJECT_CODE_TRACKER_V1';

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [currency, setCurrency] = useState<string>('₹');

  const loadStored = <T,>(key: string, defaultVal: T): T => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${key}`);
      return stored ? JSON.parse(stored) : defaultVal;
    } catch {
      return defaultVal;
    }
  };

  const [clients, setClients] = useState<ClientMaster[]>(() => loadStored('clients', initialClients));
  const [projects, setProjects] = useState<ProjectMaster[]>(() => loadStored('projects', initialProjects));
  const [itemTypes, setItemTypes] = useState<ItemTypeMaster[]>(() => loadStored('itemTypes', initialItemTypes));
  const [items, setItems] = useState<ItemMaster[]>(() => loadStored('items', initialItems));
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryMaster[]>(() =>
    loadStored('expenseCategories', initialExpenseCategories)
  );
  const [vendors, setVendors] = useState<VendorMaster[]>(() => loadStored('vendors', initialVendors));
  const [users, setUsers] = useState<UserMaster[]>(() => loadStored('users', initialUsers));
  const [roles, setRoles] = useState<RoleMaster[]>(() => loadStored('roles', initialRoles));
  const [userRoles, setUserRoles] = useState<UserRoleMapping[]>(() =>
    loadStored('userRoles', initialUserRoleMappings)
  );
  const [expenses, setExpenses] = useState<ExpenseMaster[]>(() => loadStored('expenses', initialExpenses));
  const [currentUser, setCurrentUser] = useState<UserMaster>(() => users[0] || initialUsers[0]);

  // Sync state to local storage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_clients`, JSON.stringify(clients));
      localStorage.setItem(`${STORAGE_KEY}_projects`, JSON.stringify(projects));
      localStorage.setItem(`${STORAGE_KEY}_itemTypes`, JSON.stringify(itemTypes));
      localStorage.setItem(`${STORAGE_KEY}_items`, JSON.stringify(items));
      localStorage.setItem(`${STORAGE_KEY}_expenseCategories`, JSON.stringify(expenseCategories));
      localStorage.setItem(`${STORAGE_KEY}_vendors`, JSON.stringify(vendors));
      localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(users));
      localStorage.setItem(`${STORAGE_KEY}_roles`, JSON.stringify(roles));
      localStorage.setItem(`${STORAGE_KEY}_userRoles`, JSON.stringify(userRoles));
      localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify(expenses));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }, [clients, projects, itemTypes, items, expenseCategories, vendors, users, roles, userRoles, expenses]);

  // Client CRUD
  const addClient = (c: Omit<ClientMaster, 'id'>): ClientMaster => {
    const nextId = Math.max(0, ...clients.map((item) => item.id)) + 1;
    const newClient: ClientMaster = { ...c, id: nextId };
    setClients((prev) => [newClient, ...prev]);
    return newClient;
  };
  const updateClient = (c: ClientMaster) => {
    setClients((prev) => prev.map((item) => (item.id === c.id ? c : item)));
  };
  const deleteClient = (id: number) => {
    setClients((prev) => prev.filter((item) => item.id !== id));
  };

  // Project CRUD
  const addProject = (p: Omit<ProjectMaster, 'id'>): ProjectMaster => {
    const nextId = Math.max(0, ...projects.map((item) => item.id)) + 1;
    const newProject: ProjectMaster = { ...p, id: nextId };
    setProjects((prev) => [newProject, ...prev]);
    return newProject;
  };
  const updateProject = (p: ProjectMaster) => {
    setProjects((prev) => prev.map((item) => (item.id === p.id ? p : item)));
  };
  const deleteProject = (id: number) => {
    setProjects((prev) => prev.filter((item) => item.id !== id));
  };

  // Item Type CRUD
  const addItemType = (t: Omit<ItemTypeMaster, 'id'>): ItemTypeMaster => {
    const nextId = Math.max(0, ...itemTypes.map((item) => item.id)) + 1;
    const newType: ItemTypeMaster = { ...t, id: nextId };
    setItemTypes((prev) => [newType, ...prev]);
    return newType;
  };
  const updateItemType = (t: ItemTypeMaster) => {
    setItemTypes((prev) => prev.map((item) => (item.id === t.id ? t : item)));
  };
  const deleteItemType = (id: number) => {
    setItemTypes((prev) => prev.filter((item) => item.id !== id));
  };

  // Item CRUD
  const addItem = (itm: Omit<ItemMaster, 'id'>): ItemMaster => {
    const nextId = Math.max(0, ...items.map((item) => item.id)) + 1;
    const newItem: ItemMaster = { ...itm, id: nextId };
    setItems((prev) => [newItem, ...prev]);
    return newItem;
  };
  const updateItem = (itm: ItemMaster) => {
    setItems((prev) => prev.map((item) => (item.id === itm.id ? itm : item)));
  };
  const deleteItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Expense Category CRUD
  const addExpenseCategory = (cat: Omit<ExpenseCategoryMaster, 'id'>): ExpenseCategoryMaster => {
    const nextId = Math.max(0, ...expenseCategories.map((item) => item.id)) + 1;
    const newCat: ExpenseCategoryMaster = { ...cat, id: nextId };
    setExpenseCategories((prev) => [newCat, ...prev]);
    return newCat;
  };
  const updateExpenseCategory = (cat: ExpenseCategoryMaster) => {
    setExpenseCategories((prev) => prev.map((item) => (item.id === cat.id ? cat : item)));
  };
  const deleteExpenseCategory = (id: number) => {
    setExpenseCategories((prev) => prev.filter((item) => item.id !== id));
  };

  // Vendor CRUD
  const addVendor = (v: Omit<VendorMaster, 'id'>): VendorMaster => {
    const nextId = Math.max(0, ...vendors.map((item) => item.id)) + 1;
    const newVendor: VendorMaster = { ...v, id: nextId };
    setVendors((prev) => [newVendor, ...prev]);
    return newVendor;
  };
  const updateVendor = (v: VendorMaster) => {
    setVendors((prev) => prev.map((item) => (item.id === v.id ? v : item)));
  };
  const deleteVendor = (id: number) => {
    setVendors((prev) => prev.filter((item) => item.id !== id));
  };

  // User CRUD
  const addUser = (u: Omit<UserMaster, 'id'>): UserMaster => {
    const nextId = Math.max(0, ...users.map((item) => item.id)) + 1;
    const newUser: UserMaster = { ...u, id: nextId };
    setUsers((prev) => [newUser, ...prev]);
    return newUser;
  };
  const updateUser = (u: UserMaster) => {
    setUsers((prev) => prev.map((item) => (item.id === u.id ? u : item)));
  };
  const deleteUser = (id: number) => {
    setUsers((prev) => prev.filter((item) => item.id !== id));
  };

  // Role CRUD
  const addRole = (r: Omit<RoleMaster, 'id'>): RoleMaster => {
    const nextId = Math.max(0, ...roles.map((item) => item.id)) + 1;
    const newRole: RoleMaster = { ...r, id: nextId };
    setRoles((prev) => [newRole, ...prev]);
    return newRole;
  };
  const updateRole = (r: RoleMaster) => {
    setRoles((prev) => prev.map((item) => (item.id === r.id ? r : item)));
  };
  const deleteRole = (id: number) => {
    setRoles((prev) => prev.filter((item) => item.id !== id));
  };

  // User Role Mapping
  const assignUserRole = (userId: number, roleId: number) => {
    const existing = userRoles.find((ur) => ur.user_id === userId && ur.role_id === roleId);
    if (existing) return;
    const nextId = Math.max(0, ...userRoles.map((item) => item.id)) + 1;
    const newMapping: UserRoleMapping = {
      id: nextId,
      user_id: userId,
      role_id: roleId,
      assigned_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    setUserRoles((prev) => [newMapping, ...prev]);
  };
  const removeUserRole = (mappingId: number) => {
    setUserRoles((prev) => prev.filter((item) => item.id !== mappingId));
  };

  // Expense CRUD
  const addExpense = (exp: Omit<ExpenseMaster, 'id'>): ExpenseMaster => {
    const nextId = Math.max(0, ...expenses.map((item) => item.id)) + 1;
    const newExpense: ExpenseMaster = { ...exp, id: nextId };
    setExpenses((prev) => [newExpense, ...prev]);
    return newExpense;
  };
  const updateExpense = (exp: ExpenseMaster) => {
    setExpenses((prev) => prev.map((item) => (item.id === exp.id ? exp : item)));
  };
  const deleteExpense = (id: number) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  // Lookups
  const getClient = (id?: number) => clients.find((c) => c.id === id);
  const getProject = (id?: number) => projects.find((p) => p.id === id);
  const getItemType = (id?: number) => itemTypes.find((t) => t.id === id);
  const getItem = (id?: number) => items.find((i) => i.id === id);
  const getExpenseCategory = (id?: number) => expenseCategories.find((c) => c.id === id);
  const getVendor = (id?: number) => vendors.find((v) => v.id === id);
  const getUser = (id?: number) => users.find((u) => u.id === id);
  const getRole = (id?: number) => roles.find((r) => r.id === id);

  const getUserRoles = (userId: number): RoleMaster[] => {
    const mappings = userRoles.filter((m) => m.user_id === userId);
    return mappings
      .map((m) => roles.find((r) => r.id === m.role_id))
      .filter((r): r is RoleMaster => Boolean(r));
  };

  const getProjectExpenses = (projectId: number) =>
    expenses.filter((e) => e.project_id === projectId);

  const getProjectSpent = (projectId: number) => {
    return expenses
      .filter((e) => e.project_id === projectId)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  };

  const getVendorSpent = (vendorId: number) => {
    const vendorExps = expenses.filter((e) => e.vendor_id === vendorId);
    const total = vendorExps.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const paid = vendorExps
      .filter((e) => e.payment_status === 'Paid')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const unpaid = total - paid;
    return { total, paid, unpaid };
  };

  const resetToSampleData = () => {
    setClients(initialClients);
    setProjects(initialProjects);
    setItemTypes(initialItemTypes);
    setItems(initialItems);
    setExpenseCategories(initialExpenseCategories);
    setVendors(initialVendors);
    setUsers(initialUsers);
    setRoles(initialRoles);
    setUserRoles(initialUserRoleMappings);
    setExpenses(initialExpenses);
    setCurrentUser(initialUsers[0]);
  };

  const exportDatabaseJSON = () => {
    const dbDump = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      clients,
      projects,
      itemTypes,
      items,
      expenseCategories,
      vendors,
      users,
      roles,
      userRoles,
      expenses,
    };
    return JSON.stringify(dbDump, null, 2);
  };

  const importDatabaseJSON = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.clients)) setClients(data.clients);
      if (Array.isArray(data.projects)) setProjects(data.projects);
      if (Array.isArray(data.itemTypes)) setItemTypes(data.itemTypes);
      if (Array.isArray(data.items)) setItems(data.items);
      if (Array.isArray(data.expenseCategories)) setExpenseCategories(data.expenseCategories);
      if (Array.isArray(data.vendors)) setVendors(data.vendors);
      if (Array.isArray(data.users)) setUsers(data.users);
      if (Array.isArray(data.roles)) setRoles(data.roles);
      if (Array.isArray(data.userRoles)) setUserRoles(data.userRoles);
      if (Array.isArray(data.expenses)) setExpenses(data.expenses);
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  };

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      currency,
      setCurrency,
      currentUser,
      setCurrentUser,
      clients,
      projects,
      itemTypes,
      items,
      expenseCategories,
      vendors,
      users,
      roles,
      userRoles,
      expenses,
      addClient,
      updateClient,
      deleteClient,
      addProject,
      updateProject,
      deleteProject,
      addItemType,
      updateItemType,
      deleteItemType,
      addItem,
      updateItem,
      deleteItem,
      addExpenseCategory,
      updateExpenseCategory,
      deleteExpenseCategory,
      addVendor,
      updateVendor,
      deleteVendor,
      addUser,
      updateUser,
      deleteUser,
      addRole,
      updateRole,
      deleteRole,
      assignUserRole,
      removeUserRole,
      addExpense,
      updateExpense,
      deleteExpense,
      getClient,
      getProject,
      getItemType,
      getItem,
      getExpenseCategory,
      getVendor,
      getUser,
      getRole,
      getUserRoles,
      getProjectExpenses,
      getProjectSpent,
      getVendorSpent,
      resetToSampleData,
      exportDatabaseJSON,
      importDatabaseJSON,
    }),
    [
      activeTab,
      currency,
      currentUser,
      clients,
      projects,
      itemTypes,
      items,
      expenseCategories,
      vendors,
      users,
      roles,
      userRoles,
      expenses,
    ]
  );

  return <ERPContext.Provider value={value}>{children}</ERPContext.Provider>;
};

export const useERP = () => {
  const ctx = useContext(ERPContext);
  if (!ctx) throw new Error('useERP must be used within an ERPProvider');
  return ctx;
};
