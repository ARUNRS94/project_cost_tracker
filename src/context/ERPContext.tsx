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
  QuotationMaster,
  NavTab,
  ThemeMode,
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
  initialQuotations,
} from '../data/seedData';
import { exportExpensesCSV, downloadFile } from '../services/api';

interface ERPContextType {
  // Navigation, Theme & Auth
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currency: string;
  themeMode: ThemeMode;
  toggleThemeMode: () => void;
  isAuthenticated: boolean;
  login: (user: UserMaster) => void;
  logout: () => void;
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
  quotations: QuotationMaster[];

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

  // Quotation CRUD (Auto-increment ID)
  addQuotation: (q: Omit<QuotationMaster, 'id'>) => QuotationMaster;
  updateQuotation: (q: QuotationMaster) => void;
  deleteQuotation: (quotationId: number) => void;
  getQuotation: (id?: number) => QuotationMaster | undefined;

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
  getVendorSpent: (vendorId: number) => number;

  // Export / Import / Download Tools
  downloadExpensesCSV: () => void;
  resetToSampleData: () => void;
  exportDatabaseJSON: () => string;
  importDatabaseJSON: (json: string) => boolean;

  // Bulk Import for All Masters
  bulkImportClients: (newClients: Omit<ClientMaster, 'id'>[]) => number;
  bulkImportProjects: (newProjects: Omit<ProjectMaster, 'id'>[]) => number;
  bulkImportVendors: (newVendors: Omit<VendorMaster, 'id'>[]) => number;
  bulkImportItems: (newItems: Omit<ItemMaster, 'id'>[]) => number;
  bulkImportItemTypes: (newItemTypes: Omit<ItemTypeMaster, 'id'>[]) => number;
  bulkImportCategories: (newCats: Omit<ExpenseCategoryMaster, 'id'>[]) => number;
  bulkImportExpenses: (newExpenses: Omit<ExpenseMaster, 'id'>[]) => number;
  bulkImportQuotations: (newQuotations: Omit<QuotationMaster, 'id'>[]) => number;
}

const STORAGE_KEY = 'PROJECT_CODE_TRACKER_V1';

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const currency = '₹'; // Fixed Rupee currency as requested

  const loadStored = <T,>(key: string, defaultVal: T): T => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${key}`);
      return stored ? JSON.parse(stored) : defaultVal;
    } catch {
      return defaultVal;
    }
  };

  // Theme state
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_theme`);
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleThemeMode = () => {
    setThemeMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(`${STORAGE_KEY}_theme`, next);
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'light') {
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
    }
  }, [themeMode]);

  // Master Data States
  const [clients, setClients] = useState<ClientMaster[]>(() => loadStored('clients', initialClients));
  const [projects, setProjects] = useState<ProjectMaster[]>(() => {
    const loaded = loadStored('projects', initialProjects);
    return loaded.map((p: ProjectMaster) => {
      if (p.pricing !== undefined) return p;
      const initialMatch = initialProjects.find((ip) => ip.id === p.id);
      return {
        ...p,
        pricing: initialMatch?.pricing ?? Math.round((Number(p.approved_budget) || 0) * 1.35),
      };
    });
  });
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
  const [quotations, setQuotations] = useState<QuotationMaster[]>(() =>
    loadStored('quotations', initialQuotations)
  );

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`${STORAGE_KEY}_auth`) === 'true';
    } catch {
      return true; // default logged in for immediate demo usability
    }
  });

  const [currentUser, setCurrentUser] = useState<UserMaster>(() => {
    const savedUser = loadStored<UserMaster | null>('currentUser', null);
    return savedUser || users[0] || initialUsers[0];
  });

  const login = (user: UserMaster) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem(`${STORAGE_KEY}_auth`, 'true');
    localStorage.setItem(`${STORAGE_KEY}_currentUser`, JSON.stringify(user));
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.setItem(`${STORAGE_KEY}_auth`, 'false');
  };

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
      localStorage.setItem(`${STORAGE_KEY}_quotations`, JSON.stringify(quotations));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }, [clients, projects, itemTypes, items, expenseCategories, vendors, users, roles, userRoles, expenses, quotations]);

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
  const addItemType = (it: Omit<ItemTypeMaster, 'id'>): ItemTypeMaster => {
    const nextId = Math.max(0, ...itemTypes.map((item) => item.id)) + 1;
    const newItemType: ItemTypeMaster = { ...it, id: nextId };
    setItemTypes((prev) => [...prev, newItemType]);
    return newItemType;
  };
  const updateItemType = (it: ItemTypeMaster) => {
    setItemTypes((prev) => prev.map((item) => (item.id === it.id ? it : item)));
  };
  const deleteItemType = (id: number) => {
    setItemTypes((prev) => prev.filter((item) => item.id !== id));
  };

  // Item CRUD
  const addItem = (i: Omit<ItemMaster, 'id'>): ItemMaster => {
    const nextId = Math.max(0, ...items.map((item) => item.id)) + 1;
    const newItem: ItemMaster = { ...i, id: nextId };
    setItems((prev) => [newItem, ...prev]);
    return newItem;
  };
  const updateItem = (i: ItemMaster) => {
    setItems((prev) => prev.map((item) => (item.id === i.id ? i : item)));
  };
  const deleteItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Expense Category CRUD
  const addExpenseCategory = (ec: Omit<ExpenseCategoryMaster, 'id'>): ExpenseCategoryMaster => {
    const nextId = Math.max(0, ...expenseCategories.map((item) => item.id)) + 1;
    const newCat: ExpenseCategoryMaster = { ...ec, id: nextId };
    setExpenseCategories((prev) => [...prev, newCat]);
    return newCat;
  };
  const updateExpenseCategory = (ec: ExpenseCategoryMaster) => {
    setExpenseCategories((prev) => prev.map((item) => (item.id === ec.id ? ec : item)));
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
    setUsers((prev) => [...prev, newUser]);
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
    setRoles((prev) => [...prev, newRole]);
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
    const exists = userRoles.some((urm) => urm.user_id === userId && urm.role_id === roleId);
    if (exists) return;
    const nextId = Math.max(0, ...userRoles.map((item) => item.id)) + 1;
    const mapping: UserRoleMapping = {
      id: nextId,
      user_id: userId,
      role_id: roleId,
      assigned_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    setUserRoles((prev) => [...prev, mapping]);
  };
  const removeUserRole = (mappingId: number) => {
    setUserRoles((prev) => prev.filter((urm) => urm.id !== mappingId));
  };

  // Expense CRUD
  const addExpense = (e: Omit<ExpenseMaster, 'id'>): ExpenseMaster => {
    const nextId = Math.max(0, ...expenses.map((item) => item.id)) + 1;
    const newExpense: ExpenseMaster = { ...e, id: nextId };
    setExpenses((prev) => [newExpense, ...prev]);
    return newExpense;
  };
  const updateExpense = (e: ExpenseMaster) => {
    setExpenses((prev) => prev.map((item) => (item.id === e.id ? e : item)));
  };
  const deleteExpense = (id: number) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  // Quotation CRUD
  const addQuotation = (q: Omit<QuotationMaster, 'id'>): QuotationMaster => {
    const nextId = Math.max(0, ...quotations.map((item) => item.id)) + 1;
    const newQuotation: QuotationMaster = { ...q, id: nextId };
    setQuotations((prev) => [newQuotation, ...prev]);
    return newQuotation;
  };
  const updateQuotation = (q: QuotationMaster) => {
    setQuotations((prev) => prev.map((item) => (item.id === q.id ? q : item)));
  };
  const deleteQuotation = (id: number) => {
    setQuotations((prev) => prev.filter((item) => item.id !== id));
  };
  const getQuotation = (id?: number) => {
    if (!id) return undefined;
    return quotations.find((q) => q.id === id);
  };

  // Relational Lookups
  const getClient = (id?: number) => (id ? clients.find((c) => c.id === id) : undefined);
  const getProject = (id?: number) => (id ? projects.find((p) => p.id === id) : undefined);
  const getItemType = (id?: number) => (id ? itemTypes.find((it) => it.id === id) : undefined);
  const getItem = (id?: number) => (id ? items.find((i) => i.id === id) : undefined);
  const getExpenseCategory = (id?: number) =>
    id ? expenseCategories.find((cat) => cat.id === id) : undefined;
  const getVendor = (id?: number) => (id ? vendors.find((v) => v.id === id) : undefined);
  const getUser = (id?: number) => (id ? users.find((u) => u.id === id) : undefined);
  const getRole = (id?: number) => (id ? roles.find((r) => r.id === id) : undefined);

  const getUserRoles = (userId: number): RoleMaster[] => {
    const mappingRoleIds = userRoles
      .filter((urm) => urm.user_id === userId)
      .map((urm) => urm.role_id);
    return roles.filter((r) => mappingRoleIds.includes(r.id));
  };

  const getProjectExpenses = (projectId: number): ExpenseMaster[] => {
    return expenses.filter((e) => e.project_id === projectId);
  };

  const getProjectSpent = (projectId: number): number => {
    return expenses
      .filter((e) => e.project_id === projectId)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  };

  const getVendorSpent = (vendorId: number): number => {
    return expenses
      .filter((e) => e.vendor_id === vendorId)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  };

  // Direct CSV download for expenses
  const downloadExpensesCSV = () => {
    const csvContent = exportExpensesCSV(
      expenses,
      getProject,
      getExpenseCategory,
      getVendor,
      getUser
    );
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(csvContent, `Project_Code_Tracker_Expenses_${dateStr}.csv`);
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
    setQuotations(initialQuotations);
  };

  const exportDatabaseJSON = (): string => {
    return JSON.stringify(
      {
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
        quotations,
      },
      null,
      2
    );
  };

  const importDatabaseJSON = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
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
      if (Array.isArray(data.quotations)) setQuotations(data.quotations);
      return true;
    } catch (err) {
      console.error('Import failed', err);
      return false;
    }
  };

  const bulkImportClients = (newClients: Omit<ClientMaster, 'id'>[]): number => {
    let nextId = Math.max(0, ...clients.map((c) => c.id)) + 1;
    const records: ClientMaster[] = newClients.map((c) => ({
      ...c,
      id: nextId++,
    }));
    setClients((prev) => [...prev, ...records]);
    return records.length;
  };

  const bulkImportProjects = (newProjects: Omit<ProjectMaster, 'id'>[]): number => {
    let nextId = Math.max(0, ...projects.map((p) => p.id)) + 1;
    const records: ProjectMaster[] = newProjects.map((p) => ({
      ...p,
      id: nextId++,
    }));
    setProjects((prev) => [...prev, ...records]);
    return records.length;
  };

  const bulkImportVendors = (newVendors: Omit<VendorMaster, 'id'>[]): number => {
    let nextId = Math.max(0, ...vendors.map((v) => v.id)) + 1;
    const records: VendorMaster[] = newVendors.map((v) => ({
      ...v,
      id: nextId++,
    }));
    setVendors((prev) => [...prev, ...records]);
    return records.length;
  };

  const bulkImportItems = (newItems: Omit<ItemMaster, 'id'>[]): number => {
    let nextId = Math.max(0, ...items.map((i) => i.id)) + 1;
    const records: ItemMaster[] = newItems.map((i) => ({
      ...i,
      id: nextId++,
    }));
    setItems((prev) => [...prev, ...records]);
    return records.length;
  };

  const bulkImportItemTypes = (newItemTypes: Omit<ItemTypeMaster, 'id'>[]): number => {
    let nextId = Math.max(0, ...itemTypes.map((it) => it.id)) + 1;
    const records: ItemTypeMaster[] = newItemTypes.map((it) => ({
      ...it,
      id: nextId++,
    }));
    setItemTypes((prev) => [...prev, ...records]);
    return records.length;
  };

  const bulkImportCategories = (newCats: Omit<ExpenseCategoryMaster, 'id'>[]): number => {
    let nextId = Math.max(0, ...expenseCategories.map((c) => c.id)) + 1;
    const records: ExpenseCategoryMaster[] = newCats.map((c) => ({
      ...c,
      id: nextId++,
    }));
    setExpenseCategories((prev) => [...prev, ...records]);
    return records.length;
  };

  const bulkImportExpenses = (newExpenses: Omit<ExpenseMaster, 'id'>[]): number => {
    let nextId = Math.max(0, ...expenses.map((e) => e.id)) + 1;
    const records: ExpenseMaster[] = newExpenses.map((e) => ({
      ...e,
      id: nextId++,
    }));
    setExpenses((prev) => [...prev, ...records]);
    return records.length;
  };

  const bulkImportQuotations = (newQuotations: Omit<QuotationMaster, 'id'>[]): number => {
    let nextId = Math.max(0, ...quotations.map((q) => q.id)) + 1;
    const records: QuotationMaster[] = newQuotations.map((q) => ({
      ...q,
      id: nextId++,
    }));
    setQuotations((prev) => [...prev, ...records]);
    return records.length;
  };

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      currency,
      themeMode,
      toggleThemeMode,
      isAuthenticated,
      login,
      logout,
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
      quotations,
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
      addQuotation,
      updateQuotation,
      deleteQuotation,
      getQuotation,
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
      downloadExpensesCSV,
      resetToSampleData,
      exportDatabaseJSON,
      importDatabaseJSON,
      bulkImportClients,
      bulkImportProjects,
      bulkImportVendors,
      bulkImportItems,
      bulkImportItemTypes,
      bulkImportCategories,
      bulkImportExpenses,
      bulkImportQuotations,
    }),
    [
      activeTab,
      currency,
      themeMode,
      isAuthenticated,
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
      quotations,
    ]
  );

  return <ERPContext.Provider value={value}>{children}</ERPContext.Provider>;
};

export const useERP = () => {
  const ctx = useContext(ERPContext);
  if (!ctx) throw new Error('useERP must be used within an ERPProvider');
  return ctx;
};
