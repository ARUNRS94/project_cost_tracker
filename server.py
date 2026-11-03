#!/usr/bin/env python3
"""
Nexora ERP - Python Backend Server
Native Python 3.10 REST API Server with SQLite3 Database
Supports all 10 ERP Master Entities and Transactional Ledger
"""

import sys
import os
import json
import sqlite3
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

PYTHON_PORT = int(os.environ.get("PYTHON_PORT", 8000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_FILE = os.path.join(DATA_DIR, "erp_database.sqlite")

os.makedirs(DATA_DIR, exist_ok=True)

# -------------------- DATABASE SCHEMA & INIT --------------------

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # 1. Client Master
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS client_master (
        client_id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        contact_person TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        gstin TEXT,
        status TEXT DEFAULT 'Active'
    )
    """)

    # 2. Project Master
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS project_master (
        project_id TEXT PRIMARY KEY,
        project_name TEXT NOT NULL,
        client_id TEXT NOT NULL,
        description TEXT,
        start_date TEXT,
        end_date TEXT,
        approved_budget REAL DEFAULT 0,
        status TEXT DEFAULT 'Active',
        FOREIGN KEY (client_id) REFERENCES client_master(client_id)
    )
    """)

    # 3. Item Type Master
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS item_type_master (
        item_type_id TEXT PRIMARY KEY,
        description TEXT NOT NULL
    )
    """)

    # 4. Item Master
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS item_master (
        item_id TEXT PRIMARY KEY,
        item_name TEXT NOT NULL,
        item_type_id TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'Active',
        reference_picture TEXT,
        work_location_picture TEXT,
        item_size TEXT,
        default_rate REAL DEFAULT 0,
        remark TEXT,
        FOREIGN KEY (item_type_id) REFERENCES item_type_master(item_type_id)
    )
    """)

    # 5. Expense Category Master
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS expense_category_master (
        expense_category_id TEXT PRIMARY KEY,
        category_name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'Active'
    )
    """)

    # 6. Vendor Master
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vendor_master (
        id TEXT PRIMARY KEY,
        vendor_name TEXT NOT NULL,
        contact_person TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        gstin TEXT,
        vendor_type TEXT,
        status TEXT DEFAULT 'Active',
        remarks TEXT
    )
    """)

    # 7. User Master
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_master (
        user_id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        designation TEXT,
        status TEXT DEFAULT 'Active',
        created_at TEXT,
        updated_at TEXT
    )
    """)

    # 8. Role Master
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS role_master (
        role_id TEXT PRIMARY KEY,
        role_name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'Active',
        created_at TEXT
    )
    """)

    # 9. User Role Mapping
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_role_mapping (
        user_roles_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        assigned_by TEXT,
        created_at TEXT,
        FOREIGN KEY (user_id) REFERENCES user_master(user_id),
        FOREIGN KEY (role_id) REFERENCES role_master(role_id)
    )
    """)

    # 10. Expense Master
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS expense_master (
        expense_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        project_item_id TEXT,
        expense_date TEXT NOT NULL,
        expense_category_id TEXT NOT NULL,
        description TEXT,
        vendor_id TEXT NOT NULL,
        quantity REAL,
        unit TEXT,
        rate REAL,
        amount REAL NOT NULL,
        payment_status TEXT DEFAULT 'Paid',
        payment_mode TEXT DEFAULT 'Bank',
        attachment TEXT,
        reference_number TEXT,
        remarks TEXT,
        created_by TEXT,
        FOREIGN KEY (project_id) REFERENCES project_master(project_id),
        FOREIGN KEY (vendor_id) REFERENCES vendor_master(id),
        FOREIGN KEY (expense_category_id) REFERENCES expense_category_master(expense_category_id)
    )
    """)

    conn.commit()

    # Seed if tables are empty
    cursor.execute("SELECT COUNT(*) FROM client_master")
    if cursor.fetchone()[0] == 0:
        seed_database(conn)
    conn.close()

def seed_database(conn):
    cursor = conn.cursor()

    # Seed Clients
    clients = [
        ("CLI-1001", "Apex Retail Brands Ltd", "Vikram Malhotra", "+91 98201 44521", "v.malhotra@apexretail.in", "Plot 42, Bandra Kurla Complex, Mumbai, MH 400051", "27AAACA1234A1Z5", "Active"),
        ("CLI-1002", "Nexus Tech Innovations", "Pooja Iyer", "+91 80412 88900", "operations@nexustech.io", "Level 5, Embassy TechVillage, Outer Ring Rd, Bengaluru, KA 560103", "29AABCN5543K1ZM", "Active"),
        ("CLI-1003", "Skyline Urban Developers", "Rajesh Singhania", "+91 94150 23112", "rajesh.s@skylineurban.com", "88 Cyber City Tower B, DLF Phase 2, Gurugram, HR 122002", "06AAACS9981P1ZP", "Active"),
        ("CLI-1004", "Horizon Hospitality & Resorts", "Ananya Deshmukh", "+91 98901 77234", "procurement@horizonresorts.com", "Seaside Promenade, Candolim, Goa 403515", "30AAACH6654G1Z2", "Active"),
        ("CLI-1005", "Prime Logistics Hub", "Harpreet Singh", "+91 98114 66019", "h.singh@primelogistics.co.in", "NH-48 Logistics Corridor, Bhiwandi, MH 421302", "27AABCP3321L1ZQ", "Inactive"),
    ]
    cursor.executemany("INSERT INTO client_master VALUES (?,?,?,?,?,?,?,?)", clients)

    # Seed Projects
    projects = [
        ("PRJ-2001", "Metro Retail Storefront Signage Rollout", "CLI-1001", "Design, fabrication, and pan-city installation of 12 luxury storefront LED acrylic signages and directional totems.", "2026-09-01", "2026-12-15", 850000.0, "Active"),
        ("PRJ-2002", "Nexus Tech Global Summit 2026 Arena", "CLI-1002", "Stage backdrop fabrication, expo experiential booths, digital print branding, and lighting infrastructure.", "2026-10-10", "2026-11-20", 1400000.0, "Active"),
        ("PRJ-2003", "Skyline Boulevard Wayfinding & Pylons", "CLI-1003", "Architectural campus signage, illuminated monolithic pylon at main arterial gate, and basement directional markings.", "2026-07-15", "2026-10-30", 620000.0, "Completed"),
        ("PRJ-2004", "Horizon Resort Heritage Façade Illumination", "CLI-1004", "Custom brass architectural lettering, waterproof warm-white LED halo edge lighting, and guest villa directory boards.", "2026-11-01", "2027-01-25", 480000.0, "Planning"),
    ]
    cursor.executemany("INSERT INTO project_master VALUES (?,?,?,?,?,?,?,?)", projects)

    # Seed Item Types
    item_types = [
        ("TYP-FAB", "Architectural Metal & Acrylic Fabrication"),
        ("TYP-PRN", "Large Format UV & Solvent Digital Printing"),
        ("TYP-LED", "Commercial LED Illumination & Drivers"),
        ("TYP-STR", "Structural Heavy Steel & Truss Framing"),
        ("TYP-ELE", "Electrical Cabling, Breakers & Automation"),
    ]
    cursor.executemany("INSERT INTO item_type_master VALUES (?,?)", item_types)

    # Seed Items
    items = [
        ("ITM-301", "3D Acrylic Channel Letter Glow Sign", "TYP-FAB", "Cast acrylic face with aluminum return profile, IP67 Samsung LED modules inside, 12V waterproof driver.", "Active", "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=600&q=80", "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80", "18ft x 3.5ft", 145000.0, "Requires scissor lift for installation at 22ft façade height"),
        ("ITM-302", "Backlit Fabric Lightbox Totem (Pylon)", "TYP-PRN", "UV dye-sublimation tension fabric graphic with heavy duty steel base and perimeter edge illumination.", "Active", "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80", "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80", "4ft x 8ft Double Sided", 62000.0, "Modular frame for rapid change of seasonal graphics"),
        ("ITM-303", "Heavy Duty MS Ground Foundation Pylon", "TYP-STR", "Mild steel box section 150x150mm with hot-dip galvanized base plate and high-tensile anchor bolts.", "Active", "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80", "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=600&q=80", "20ft Height x 3ft Base", 185000.0, "Civil excavation & M25 concrete curing requires 7 days"),
        ("ITM-304", "Die-Cut Solid Brushed Brass Directional Plaque", "TYP-FAB", "3mm solid brass with chemical acid etching, dark oxidized relief lettering, and clear protective lacquer coat.", "Active", "https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=600&q=80", "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80", "24in x 16in", 28000.0, "Direct wall standoff installation on granite finish"),
        ("ITM-305", "High Intensity LED Perimeter Lighting Strip", "TYP-LED", "24V constant current silicone extruded neon flex IP68 rated, 3000K warm architectural glow.", "Active", "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80", "https://images.unsplash.com/photo-1508873535684-277a3cbcc4e8?auto=format&fit=crop&w=600&q=80", "50 Metre Roll", 35000.0, "Supplied with MeanWell power supply and surge suppressor"),
    ]
    cursor.executemany("INSERT INTO item_master VALUES (?,?,?,?,?,?,?,?,?,?)", items)

    # Seed Expense Categories
    cats = [
        ("CAT-LAB", "Labour", "On-site installation crews, civil workers, certified scaffolders, and metal welders.", "Active"),
        ("CAT-MAT", "Material", "Raw sheets (acrylic, ACP, brass, steel), fasteners, structural sections, and adhesives.", "Active"),
        ("CAT-PRN", "Printing", "Large format roll printing, UV flatbed printing, vinyl lamination, and mesh banners.", "Active"),
        ("CAT-LOG", "Logistics", "Freight carriers, local tempo transit, hydraulic crane lifting, and site delivery.", "Active"),
        ("CAT-PRM", "Permits & Approvals", "Municipal corporation outdoor signage fees, structural safety certificates, and fire NOC.", "Active"),
    ]
    cursor.executemany("INSERT INTO expense_category_master VALUES (?,?,?,?)", cats)

    # Seed Vendors
    vendors = [
        ("VND-401", "Precision Metal Crafters Pvt Ltd", "Mohd. Rafiq", "+91 98210 33490", "quotes@precisionmetal.in", "Gala 14, Industrial Estate, Kanjurmarg West, Mumbai 400078", "27AABCP7812M1Z3", "Material Supplier", "Active", "Preferred vendor for heavy laser cutting & sheet bending"),
        ("VND-402", "Vibrant Colors UV Graphics Hub", "Gautam Rao", "+91 99002 44100", "print@vibrantcolors.com", "Plot 10, Industrial Layout, Peenya 2nd Phase, Bengaluru 560058", "29AAFCV8810K1ZB", "Digital Print Agency", "Active", "Equipped with 3.2m EFI VUTEk UV Flatbed printer"),
        ("VND-403", "Shree Sai Rigging & Labour Contractors", "Santosh Kamble", "+91 97690 12560", "santosh.riggers@gmail.com", "Shop 8, Station Road, Vikhroli, Mumbai 400083", "27AAZPK5109J1ZQ", "Labour Contractor", "Active", "Supplies certified riggers with height work safety harnesses"),
        ("VND-404", "Lumina Tech Opto-Electronics", "Dharmesh Parekh", "+91 93220 89123", "sales@luminatechopto.in", "102 Lamington Road, Grant Road East, Mumbai 400007", "27AADCL4490P1ZR", "Equipment & Electronics", "Active", "Authorized distributor of Samsung LED modules and MeanWell SMPS"),
        ("VND-405", "Falcon Heavy Haulage & Cranes", "Gurmeet Gill", "+91 98199 44322", "dispatch@falconhaulage.com", "Sector 19, Vashi Truck Terminal, Navi Mumbai 400703", "27AAHFG1201B1ZH", "Logistics", "Active", "Provides 25-ton telescopic mobile cranes and cherry pickers"),
        ("VND-406", "Civic Compliance Consultants", "Advocate Sneha Kulkarni", "+91 98200 66551", "compliance@civiclegal.in", "Office 401, Nariman Point, Mumbai 400021", "27AAKFS9021R1ZW", "Consultancy", "Active", "Manages municipal hoardings and structural stability filings"),
    ]
    cursor.executemany("INSERT INTO vendor_master VALUES (?,?,?,?,?,?,?,?,?,?)", vendors)

    # Seed Users
    users = [
        ("USR-001", "Arun Ramesh", "arunrameshsusi@gmail.com", "+91 98450 11223", "Managing Director & Principal Architect", "Active", "2025-01-10T09:00:00Z", "2026-11-01T14:30:00Z"),
        ("USR-002", "Kavita Menon", "kavita.m@nexoraerp.com", "+91 98204 88712", "Senior Project Operations Manager", "Active", "2025-03-15T10:15:00Z", "2026-10-25T11:20:00Z"),
        ("USR-003", "Deepak Agrawal", "deepak.finance@nexoraerp.com", "+91 94140 33901", "Chief Financial Controller & Auditor", "Active", "2025-02-01T08:30:00Z", "2026-10-30T17:00:00Z"),
        ("USR-004", "Rohan Salunkhe", "rohan.s@nexoraerp.com", "+91 97699 00814", "Site Operations & Quality Supervisor", "Active", "2025-06-20T11:00:00Z", "2026-11-02T09:15:00Z"),
        ("USR-005", "Simran Gill", "simran.g@nexoraerp.com", "+91 98110 55412", "Junior Procurement & Accounts Executive", "Active", "2026-01-05T10:00:00Z", "2026-10-15T16:45:00Z"),
    ]
    cursor.executemany("INSERT INTO user_master VALUES (?,?,?,?,?,?,?,?)", users)

    # Seed Roles
    roles = [
        ("ROL-ADMIN", "Admin", "Unrestricted full system administrative access, schema management, user & role provisioning, and financial overrides.", "Active", "2025-01-01T00:00:00Z"),
        ("ROL-MGR", "Manager", "Project planning, budget assignments, client management, expense creation, and milestone approvals.", "Active", "2025-01-01T00:00:00Z"),
        ("ROL-ACCT", "Accountant", "Financial expense verification, payment status updates (Cash/Bank/UPI), invoice matching, and ledger audits.", "Active", "2025-01-01T00:00:00Z"),
        ("ROL-EMP", "Employee", "Site expense entry, bill attachment uploads, item work location picture documentation, and status viewing.", "Active", "2025-01-01T00:00:00Z"),
    ]
    cursor.executemany("INSERT INTO role_master VALUES (?,?,?,?,?)", roles)

    # Seed User Role Mappings
    user_roles = [
        ("URM-001", "USR-001", "ROL-ADMIN", "USR-001", "2025-01-10T09:05:00Z"),
        ("URM-002", "USR-002", "ROL-MGR", "USR-001", "2025-03-15T10:20:00Z"),
        ("URM-003", "USR-003", "ROL-ACCT", "USR-001", "2025-02-01T08:35:00Z"),
        ("URM-004", "USR-004", "ROL-EMP", "USR-002", "2025-06-20T11:05:00Z"),
        ("URM-005", "USR-005", "ROL-ACCT", "USR-003", "2026-01-05T10:10:00Z"),
    ]
    cursor.executemany("INSERT INTO user_role_mapping VALUES (?,?,?,?,?)", user_roles)

    # Seed Expenses
    expenses = [
        ("EXP-8001", "PRJ-2001", "ITM-301", "2026-09-12", "CAT-MAT", "Grade-A 4mm cast acrylic sheets (Opal White & Jet Black) and CNC precision routing", "VND-401", 14.0, "Sheets", 6500.0, 91000.0, "Paid", "Bank", "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80", "INV-PMC-2026/891", "Delivered directly to Bandra BKC staging yard; checked by Rohan", "USR-002"),
        ("EXP-8002", "PRJ-2001", "ITM-305", "2026-09-20", "CAT-MAT", "Samsung high lumen 1.2W IP68 LED injection modules and waterproof MeanWell drivers", "VND-404", 350.0, "Modules", 180.0, 63000.0, "Paid", "UPI", "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=600&q=80", "UPI/UTR-9921448102", "5-year warranty card stamped and filed in procurement folder", "USR-004"),
        ("EXP-8003", "PRJ-2001", "ITM-301", "2026-10-02", "CAT-LAB", "Façade night rigging crew with safety ropes and scaffolding erection for 3 nights", "VND-403", 6.0, "Riggers x 3 Days", 7500.0, 45000.0, "Paid", "Cash", "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80", "VOUCH-CSH-1044", "Cash petty voucher signed by site supervisor Santosh", "USR-004"),
        ("EXP-8004", "PRJ-2001", "ITM-301", "2026-10-14", "CAT-LOG", "20-ton telescopic boom crane rental for main façade lifting during mall non-trading hours", "VND-405", 2.0, "Shifts", 22000.0, 44000.0, "Partial", "Bank", "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80", "NEFT-FALCON-771", "50% advance released; remaining balance upon completion of de-rigging", "USR-003"),
        ("EXP-8005", "PRJ-2002", "ITM-302", "2026-10-18", "CAT-PRN", "Ultra-wide seamless tension fabric backdrop prints with silicon keder beading", "VND-402", 8.0, "Panels (30x12ft)", 24500.0, 196000.0, "Paid", "Bank", "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80", "INV-VC-2026-441", "High gamut colour match approved by Nexus Tech brand director", "USR-002"),
        ("EXP-8006", "PRJ-2002", "ITM-303", "2026-10-25", "CAT-MAT", "Aluminum modular stage truss sections and heavy steel ballast plates", "VND-401", 24.0, "Truss Units", 5500.0, 132000.0, "Unpaid", "Bank", "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80", "INV-PMC-2026/912", "Net 30 payment terms; due for clearance on 25-Nov", "USR-002"),
        ("EXP-8007", "PRJ-2002", None, "2026-10-28", "CAT-LAB", "Expo booth assembly carpentering & electrical termination squad (12 technicians)", "VND-403", 12.0, "Crew Days", 6000.0, 72000.0, "Paid", "UPI", "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=600&q=80", "UPI/UTR-8812903120", "Completed arena setup 4 hours ahead of schedule", "USR-004"),
        ("EXP-8008", "PRJ-2003", "ITM-303", "2026-08-10", "CAT-MAT", "Galvanized steel column pylon structure and cast base flange plate with laser cut holes", "VND-401", 1.0, "Structure", 165000.0, 165000.0, "Paid", "Bank", "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80", "INV-PMC-2026/745", "Includes wind load safety compliance certificate (up to 150 km/h)", "USR-002"),
        ("EXP-8009", "PRJ-2003", "ITM-304", "2026-08-28", "CAT-MAT", "Architectural solid brass direction plates for main lobby and executive suites", "VND-401", 8.0, "Plaques", 14000.0, 112000.0, "Paid", "Bank", "https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=600&q=80", "INV-PMC-2026/801", "Clear protective electrophoretic lacquer applied", "USR-002"),
        ("EXP-8010", "PRJ-2003", None, "2026-09-05", "CAT-PRM", "Gurugram Municipal Corporation (MCG) outdoor structural stability clearance and fee", "VND-406", 1.0, "Filing & NOC", 42000.0, 42000.0, "Paid", "Bank", "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80", "CHQ-890211-MCG", "Official government receipt attached; registration valid for 3 years", "USR-003"),
        ("EXP-8011", "PRJ-2004", None, "2026-11-02", "CAT-PRM", "Heritage zone architectural facade lighting feasibility audit & coastal regulatory sanction", "VND-406", 1.0, "Clearance Audit", 35000.0, 35000.0, "Unpaid", "Bank", "", "PO-HORIZON-004-PRM", "Pending site survey scheduled with town planner on Nov 10", "USR-002"),
    ]
    cursor.executemany("INSERT INTO expense_master VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", expenses)

    conn.commit()

# Helper serializer
def row_to_dict(row):
    return dict(row)

def rows_to_list(rows):
    return [dict(r) for r in rows]

# -------------------- PYTHON HTTP REQUEST HANDLER --------------------

class ERPHTTPRequestHandler(BaseHTTPRequestHandler):

    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.send_header("X-Backend-Engine", "Python-3.10-SQLite-ERP")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(204)

    def _parse_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                return json.loads(body)
            except Exception:
                return {}
        return {}

    def _send_json(self, data, status=200):
        self._set_headers(status)
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def _send_error(self, message, status=400):
        self._set_headers(status)
        self.wfile.write(json.dumps({"error": message}).encode("utf-8"))

    # ----------------- ROUTING -----------------

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        conn = get_db()
        cursor = conn.cursor()

        try:
            # Health
            if path == "/api/health":
                cursor.execute("SELECT COUNT(*) FROM client_master")
                c_cnt = cursor.fetchone()[0]
                cursor.execute("SELECT COUNT(*) FROM project_master")
                p_cnt = cursor.fetchone()[0]
                cursor.execute("SELECT COUNT(*) FROM expense_master")
                e_cnt = cursor.fetchone()[0]
                self._send_json({
                    "status": "ok",
                    "backend": "Python 3.10.12 (Standard Library + SQLite3)",
                    "engine": "Nexora Python ERP Service",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "counts": {
                        "clients": c_cnt,
                        "projects": p_cnt,
                        "expenses": e_cnt
                    }
                })
                return

            # Bootstrap
            if path == "/api/bootstrap":
                cursor.execute("SELECT * FROM client_master")
                clients = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM project_master")
                projects = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM item_type_master")
                item_types = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM item_master")
                items = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM expense_category_master")
                cats = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM vendor_master")
                vendors = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM user_master")
                users = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM role_master")
                roles = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM user_role_mapping")
                user_roles = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM expense_master ORDER BY expense_date DESC")
                expenses = rows_to_list(cursor.fetchall())

                self._send_json({
                    "clients": clients,
                    "projects": projects,
                    "itemTypes": item_types,
                    "items": items,
                    "expenseCategories": cats,
                    "vendors": vendors,
                    "users": users,
                    "roles": roles,
                    "userRoles": user_roles,
                    "expenses": expenses,
                    "serverEngine": "Python 3.10 SQLite3"
                })
                return

            # Stats
            if path == "/api/stats":
                cursor.execute("SELECT SUM(approved_budget) FROM project_master")
                tot_budget = cursor.fetchone()[0] or 0
                cursor.execute("SELECT SUM(amount) FROM expense_master")
                tot_expenses = cursor.fetchone()[0] or 0
                cursor.execute("SELECT SUM(amount) FROM expense_master WHERE payment_status = 'Paid'")
                paid_expenses = cursor.fetchone()[0] or 0
                pending_expenses = tot_expenses - paid_expenses
                variance = tot_budget - tot_expenses

                self._send_json({
                    "totalApprovedBudget": tot_budget,
                    "totalExpenses": tot_expenses,
                    "variance": variance,
                    "paidExpenses": paid_expenses,
                    "pendingExpenses": pending_expenses
                })
                return

            # 1. Clients
            if path == "/api/clients":
                cursor.execute("SELECT * FROM client_master")
                self._send_json(rows_to_list(cursor.fetchall()))
                return

            # 2. Projects
            if path == "/api/projects":
                cursor.execute("SELECT * FROM project_master")
                self._send_json(rows_to_list(cursor.fetchall()))
                return

            # Project Expenses
            m_proj_exp = re.match(r"^/api/projects/([^/]+)/expenses$", path)
            if m_proj_exp:
                pid = m_proj_exp.group(1)
                cursor.execute("SELECT * FROM expense_master WHERE project_id = ? ORDER BY expense_date DESC", (pid,))
                self._send_json(rows_to_list(cursor.fetchall()))
                return

            # 3. Item Types
            if path == "/api/item-types":
                cursor.execute("SELECT * FROM item_type_master")
                self._send_json(rows_to_list(cursor.fetchall()))
                return

            # 4. Items
            if path == "/api/items":
                cursor.execute("SELECT * FROM item_master")
                self._send_json(rows_to_list(cursor.fetchall()))
                return

            # 5. Expense Categories
            if path == "/api/expense-categories":
                cursor.execute("SELECT * FROM expense_category_master")
                self._send_json(rows_to_list(cursor.fetchall()))
                return

            # 6. Vendors
            if path == "/api/vendors":
                cursor.execute("SELECT * FROM vendor_master")
                self._send_json(rows_to_list(cursor.fetchall()))
                return

            # 7. Users
            if path == "/api/users":
                cursor.execute("SELECT * FROM user_master")
                self._send_json(rows_to_list(cursor.fetchall()))
                return

            # 8. Roles
            if path == "/api/roles":
                cursor.execute("SELECT * FROM role_master")
                self._send_json(rows_to_list(cursor.fetchall()))
                return

            # 9. User Role Mappings
            if path == "/api/user-roles":
                cursor.execute("SELECT * FROM user_role_mapping")
                self._send_json(rows_to_list(cursor.fetchall()))
                return

            # 10. Expenses
            if path == "/api/expenses":
                query = "SELECT * FROM expense_master WHERE 1=1"
                params = []
                if "projectId" in qs and qs["projectId"][0] != "all":
                    query += " AND project_id = ?"
                    params.append(qs["projectId"][0])
                if "vendorId" in qs and qs["vendorId"][0] != "all":
                    query += " AND vendor_id = ?"
                    params.append(qs["vendorId"][0])
                if "categoryId" in qs and qs["categoryId"][0] != "all":
                    query += " AND expense_category_id = ?"
                    params.append(qs["categoryId"][0])
                if "status" in qs and qs["status"][0] != "all":
                    query += " AND payment_status = ?"
                    params.append(qs["status"][0])
                if "mode" in qs and qs["mode"][0] != "all":
                    query += " AND payment_mode = ?"
                    params.append(qs["mode"][0])
                if "q" in qs and qs["q"][0].strip():
                    term = f"%{qs['q'][0].strip()}%"
                    query += " AND (expense_id LIKE ? OR description LIKE ? OR reference_number LIKE ?)"
                    params.extend([term, term, term])

                query += " ORDER BY expense_date DESC"
                cursor.execute(query, params)
                self._send_json(rows_to_list(cursor.fetchall()))
                return

            # Backup export
            if path == "/api/backup/export":
                cursor.execute("SELECT * FROM client_master")
                clients = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM project_master")
                projects = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM item_type_master")
                item_types = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM item_master")
                items = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM expense_category_master")
                cats = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM vendor_master")
                vendors = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM user_master")
                users = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM role_master")
                roles = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM user_role_mapping")
                user_roles = rows_to_list(cursor.fetchall())
                cursor.execute("SELECT * FROM expense_master")
                expenses = rows_to_list(cursor.fetchall())

                self._send_json({
                    "version": "1.0",
                    "exportedAt": datetime.utcnow().isoformat() + "Z",
                    "clients": clients,
                    "projects": projects,
                    "itemTypes": item_types,
                    "items": items,
                    "expenseCategories": cats,
                    "vendors": vendors,
                    "users": users,
                    "roles": roles,
                    "userRoles": user_roles,
                    "expenses": expenses
                })
                return

            self._send_error(f"Route not found: {path}", 404)
        finally:
            conn.close()

    def do_POST(self):
        path = urlparse(self.path).path
        data = self._parse_body()
        conn = get_db()
        cursor = conn.cursor()

        try:
            if path == "/api/clients":
                cursor.execute("""
                INSERT OR REPLACE INTO client_master (client_id, client_name, contact_person, phone, email, address, gstin, status)
                VALUES (?,?,?,?,?,?,?,?)
                """, (data.get("client_id"), data.get("client_name"), data.get("contact_person", ""), data.get("phone", ""), data.get("email", ""), data.get("address", ""), data.get("GSTIN", data.get("gstin", "")), data.get("status", "Active")))
                conn.commit()
                self._send_json(data, 201)
                return

            if path == "/api/projects":
                cursor.execute("""
                INSERT OR REPLACE INTO project_master (project_id, project_name, client_id, description, start_date, end_date, approved_budget, status)
                VALUES (?,?,?,?,?,?,?,?)
                """, (data.get("project_id"), data.get("project_name"), data.get("client_id"), data.get("description", ""), data.get("start_date", ""), data.get("end_date", ""), float(data.get("approved_budget", 0)), data.get("status", "Active")))
                conn.commit()
                self._send_json(data, 201)
                return

            if path == "/api/item-types":
                cursor.execute("""
                INSERT OR REPLACE INTO item_type_master (item_type_id, description)
                VALUES (?,?)
                """, (data.get("item_type_id"), data.get("description", "")))
                conn.commit()
                self._send_json(data, 201)
                return

            if path == "/api/items":
                cursor.execute("""
                INSERT OR REPLACE INTO item_master (item_id, item_name, item_type_id, description, status, reference_picture, work_location_picture, item_size, default_rate, remark)
                VALUES (?,?,?,?,?,?,?,?,?,?)
                """, (data.get("item_id"), data.get("item_name"), data.get("item_type_id"), data.get("description", ""), data.get("status", "Active"), data.get("reference_picture", ""), data.get("work_location_picture", ""), data.get("item_size", ""), float(data.get("default_rate", 0)), data.get("remark", "")))
                conn.commit()
                self._send_json(data, 201)
                return

            if path == "/api/expense-categories":
                cursor.execute("""
                INSERT OR REPLACE INTO expense_category_master (expense_category_id, category_name, description, status)
                VALUES (?,?,?,?)
                """, (data.get("expense_category_id"), data.get("category_name"), data.get("description", ""), data.get("status", "Active")))
                conn.commit()
                self._send_json(data, 201)
                return

            if path == "/api/vendors":
                cursor.execute("""
                INSERT OR REPLACE INTO vendor_master (id, vendor_name, contact_person, phone, email, address, gstin, vendor_type, status, remarks)
                VALUES (?,?,?,?,?,?,?,?,?,?)
                """, (data.get("id"), data.get("vendor_name"), data.get("contact_person", ""), data.get("phone", ""), data.get("email", ""), data.get("address", ""), data.get("gstin", ""), data.get("vendor_type", ""), data.get("status", "Active"), data.get("remarks", "")))
                conn.commit()
                self._send_json(data, 201)
                return

            if path == "/api/users":
                now = datetime.utcnow().isoformat() + "Z"
                cursor.execute("""
                INSERT OR REPLACE INTO user_master (user_id, full_name, email, phone, designation, status, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?)
                """, (data.get("user_id"), data.get("full_name"), data.get("email"), data.get("phone", ""), data.get("designation", ""), data.get("status", "Active"), data.get("created_at", now), now))
                conn.commit()
                self._send_json(data, 201)
                return

            if path == "/api/roles":
                now = datetime.utcnow().isoformat() + "Z"
                cursor.execute("""
                INSERT OR REPLACE INTO role_master (role_id, role_name, description, status, created_at)
                VALUES (?,?,?,?,?)
                """, (data.get("role_id"), data.get("role_name"), data.get("description", ""), data.get("status", "Active"), data.get("created_at", now)))
                conn.commit()
                self._send_json(data, 201)
                return

            if path == "/api/user-roles":
                uid = data.get("userId", data.get("user_id"))
                rid = data.get("roleId", data.get("role_id"))
                assigned = data.get("assignedBy", data.get("assigned_by", "USR-001"))
                map_id = data.get("user_roles_id", f"URM-{int(datetime.utcnow().timestamp()) % 100000:05d}")
                now = datetime.utcnow().isoformat() + "Z"
                cursor.execute("""
                INSERT OR REPLACE INTO user_role_mapping (user_roles_id, user_id, role_id, assigned_by, created_at)
                VALUES (?,?,?,?,?)
                """, (map_id, uid, rid, assigned, now))
                conn.commit()
                self._send_json({
                    "user_roles_id": map_id,
                    "user_id": uid,
                    "role_id": rid,
                    "assigned_by": assigned,
                    "created_at": now
                }, 201)
                return

            if path == "/api/expenses":
                cursor.execute("""
                INSERT OR REPLACE INTO expense_master (expense_id, project_id, project_item_id, expense_date, expense_category_id, description, vendor_id, quantity, unit, rate, amount, payment_status, payment_mode, attachment, reference_number, remarks, created_by)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, (
                    data.get("expense_id"),
                    data.get("project_id"),
                    data.get("project_item_id"),
                    data.get("expense_date"),
                    data.get("expense_category_id"),
                    data.get("description", ""),
                    data.get("vendor_id"),
                    float(data.get("quantity")) if data.get("quantity") is not None else None,
                    data.get("unit"),
                    float(data.get("rate")) if data.get("rate") is not None else None,
                    float(data.get("amount", 0)),
                    data.get("payment_status", "Paid"),
                    data.get("payment_mode", "Bank"),
                    data.get("attachment", ""),
                    data.get("reference_number", ""),
                    data.get("remarks", ""),
                    data.get("created_by", "")
                ))
                conn.commit()
                self._send_json(data, 201)
                return

            # Reset Database to default sample seed
            if path == "/api/backup/reset":
                cursor.execute("DROP TABLE IF EXISTS client_master")
                cursor.execute("DROP TABLE IF EXISTS project_master")
                cursor.execute("DROP TABLE IF EXISTS item_type_master")
                cursor.execute("DROP TABLE IF EXISTS item_master")
                cursor.execute("DROP TABLE IF EXISTS expense_category_master")
                cursor.execute("DROP TABLE IF EXISTS vendor_master")
                cursor.execute("DROP TABLE IF EXISTS user_master")
                cursor.execute("DROP TABLE IF EXISTS role_master")
                cursor.execute("DROP TABLE IF EXISTS user_role_mapping")
                cursor.execute("DROP TABLE IF EXISTS expense_master")
                conn.commit()
                init_db()
                self._send_json({"success": True, "message": "Database reset to factory seed values via Python SQLite engine"})
                return

            # Import JSON Backup
            if path == "/api/backup/import":
                # Clear and insert all tables
                for key, tbl in [
                    ("clients", "client_master"),
                    ("projects", "project_master"),
                    ("itemTypes", "item_type_master"),
                    ("items", "item_master"),
                    ("expenseCategories", "expense_category_master"),
                    ("vendors", "vendor_master"),
                    ("users", "user_master"),
                    ("roles", "role_master"),
                    ("userRoles", "user_role_mapping"),
                    ("expenses", "expense_master")
                ]:
                    if key in data and isinstance(data[key], list):
                        cursor.execute(f"DELETE FROM {tbl}")
                conn.commit()

                if "clients" in data:
                    for c in data["clients"]:
                        cursor.execute("INSERT OR REPLACE INTO client_master VALUES (?,?,?,?,?,?,?,?)", (c.get("client_id"), c.get("client_name"), c.get("contact_person", ""), c.get("phone", ""), c.get("email", ""), c.get("address", ""), c.get("GSTIN", c.get("gstin", "")), c.get("status", "Active")))
                if "projects" in data:
                    for p in data["projects"]:
                        cursor.execute("INSERT OR REPLACE INTO project_master VALUES (?,?,?,?,?,?,?,?)", (p.get("project_id"), p.get("project_name"), p.get("client_id"), p.get("description", ""), p.get("start_date", ""), p.get("end_date", ""), float(p.get("approved_budget", 0)), p.get("status", "Active")))
                if "itemTypes" in data:
                    for t in data["itemTypes"]:
                        cursor.execute("INSERT OR REPLACE INTO item_type_master VALUES (?,?)", (t.get("item_type_id"), t.get("description", "")))
                if "items" in data:
                    for i in data["items"]:
                        cursor.execute("INSERT OR REPLACE INTO item_master VALUES (?,?,?,?,?,?,?,?,?,?)", (i.get("item_id"), i.get("item_name"), i.get("item_type_id"), i.get("description", ""), i.get("status", "Active"), i.get("reference_picture", ""), i.get("work_location_picture", ""), i.get("item_size", ""), float(i.get("default_rate", 0)), i.get("remark", "")))
                if "expenseCategories" in data:
                    for ec in data["expenseCategories"]:
                        cursor.execute("INSERT OR REPLACE INTO expense_category_master VALUES (?,?,?,?)", (ec.get("expense_category_id"), ec.get("category_name"), ec.get("description", ""), ec.get("status", "Active")))
                if "vendors" in data:
                    for v in data["vendors"]:
                        cursor.execute("INSERT OR REPLACE INTO vendor_master VALUES (?,?,?,?,?,?,?,?,?,?)", (v.get("id"), v.get("vendor_name"), v.get("contact_person", ""), v.get("phone", ""), v.get("email", ""), v.get("address", ""), v.get("gstin", ""), v.get("vendor_type", ""), v.get("status", "Active"), v.get("remarks", "")))
                if "users" in data:
                    for u in data["users"]:
                        cursor.execute("INSERT OR REPLACE INTO user_master VALUES (?,?,?,?,?,?,?,?)", (u.get("user_id"), u.get("full_name"), u.get("email", ""), u.get("phone", ""), u.get("designation", ""), u.get("status", "Active"), u.get("created_at", ""), u.get("updated_at", "")))
                if "roles" in data:
                    for r in data["roles"]:
                        cursor.execute("INSERT OR REPLACE INTO role_master VALUES (?,?,?,?,?)", (r.get("role_id"), r.get("role_name"), r.get("description", ""), r.get("status", "Active"), r.get("created_at", "")))
                if "userRoles" in data:
                    for ur in data["userRoles"]:
                        cursor.execute("INSERT OR REPLACE INTO user_role_mapping VALUES (?,?,?,?,?)", (ur.get("user_roles_id"), ur.get("user_id"), ur.get("role_id"), ur.get("assigned_by", ""), ur.get("created_at", "")))
                if "expenses" in data:
                    for e in data["expenses"]:
                        cursor.execute("INSERT OR REPLACE INTO expense_master VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (e.get("expense_id"), e.get("project_id"), e.get("project_item_id"), e.get("expense_date"), e.get("expense_category_id"), e.get("description", ""), e.get("vendor_id"), float(e.get("quantity")) if e.get("quantity") is not None else None, e.get("unit"), float(e.get("rate")) if e.get("rate") is not None else None, float(e.get("amount", 0)), e.get("payment_status", "Paid"), e.get("payment_mode", "Bank"), e.get("attachment", ""), e.get("reference_number", ""), e.get("remarks", ""), e.get("created_by", "")))

                conn.commit()
                self._send_json({"success": True, "message": "Import completed successfully in SQLite"})
                return

            self._send_error(f"POST route not found: {path}", 404)
        finally:
            conn.close()

    def do_PUT(self):
        path = urlparse(self.path).path
        data = self._parse_body()
        conn = get_db()
        cursor = conn.cursor()

        try:
            # PUT /api/clients/:id
            m = re.match(r"^/api/clients/([^/]+)$", path)
            if m:
                cid = m.group(1)
                data["client_id"] = cid
                cursor.execute("""
                UPDATE client_master SET client_name=?, contact_person=?, phone=?, email=?, address=?, gstin=?, status=?
                WHERE client_id=?
                """, (data.get("client_name"), data.get("contact_person", ""), data.get("phone", ""), data.get("email", ""), data.get("address", ""), data.get("GSTIN", data.get("gstin", "")), data.get("status", "Active"), cid))
                conn.commit()
                self._send_json(data)
                return

            # PUT /api/projects/:id
            m = re.match(r"^/api/projects/([^/]+)$", path)
            if m:
                pid = m.group(1)
                data["project_id"] = pid
                cursor.execute("""
                UPDATE project_master SET project_name=?, client_id=?, description=?, start_date=?, end_date=?, approved_budget=?, status=?
                WHERE project_id=?
                """, (data.get("project_name"), data.get("client_id"), data.get("description", ""), data.get("start_date", ""), data.get("end_date", ""), float(data.get("approved_budget", 0)), data.get("status", "Active"), pid))
                conn.commit()
                self._send_json(data)
                return

            # PUT /api/item-types/:id
            m = re.match(r"^/api/item-types/([^/]+)$", path)
            if m:
                tid = m.group(1)
                data["item_type_id"] = tid
                cursor.execute("UPDATE item_type_master SET description=? WHERE item_type_id=?", (data.get("description", ""), tid))
                conn.commit()
                self._send_json(data)
                return

            # PUT /api/items/:id
            m = re.match(r"^/api/items/([^/]+)$", path)
            if m:
                iid = m.group(1)
                data["item_id"] = iid
                cursor.execute("""
                UPDATE item_master SET item_name=?, item_type_id=?, description=?, status=?, reference_picture=?, work_location_picture=?, item_size=?, default_rate=?, remark=?
                WHERE item_id=?
                """, (data.get("item_name"), data.get("item_type_id"), data.get("description", ""), data.get("status", "Active"), data.get("reference_picture", ""), data.get("work_location_picture", ""), data.get("item_size", ""), float(data.get("default_rate", 0)), data.get("remark", ""), iid))
                conn.commit()
                self._send_json(data)
                return

            # PUT /api/expense-categories/:id
            m = re.match(r"^/api/expense-categories/([^/]+)$", path)
            if m:
                ecid = m.group(1)
                data["expense_category_id"] = ecid
                cursor.execute("""
                UPDATE expense_category_master SET category_name=?, description=?, status=?
                WHERE expense_category_id=?
                """, (data.get("category_name"), data.get("description", ""), data.get("status", "Active"), ecid))
                conn.commit()
                self._send_json(data)
                return

            # PUT /api/vendors/:id
            m = re.match(r"^/api/vendors/([^/]+)$", path)
            if m:
                vid = m.group(1)
                data["id"] = vid
                cursor.execute("""
                UPDATE vendor_master SET vendor_name=?, contact_person=?, phone=?, email=?, address=?, gstin=?, vendor_type=?, status=?, remarks=?
                WHERE id=?
                """, (data.get("vendor_name"), data.get("contact_person", ""), data.get("phone", ""), data.get("email", ""), data.get("address", ""), data.get("gstin", ""), data.get("vendor_type", ""), data.get("status", "Active"), data.get("remarks", ""), vid))
                conn.commit()
                self._send_json(data)
                return

            # PUT /api/users/:id
            m = re.match(r"^/api/users/([^/]+)$", path)
            if m:
                uid = m.group(1)
                data["user_id"] = uid
                now = datetime.utcnow().isoformat() + "Z"
                cursor.execute("""
                UPDATE user_master SET full_name=?, email=?, phone=?, designation=?, status=?, updated_at=?
                WHERE user_id=?
                """, (data.get("full_name"), data.get("email"), data.get("phone", ""), data.get("designation", ""), data.get("status", "Active"), now, uid))
                conn.commit()
                self._send_json(data)
                return

            # PUT /api/roles/:id
            m = re.match(r"^/api/roles/([^/]+)$", path)
            if m:
                rid = m.group(1)
                data["role_id"] = rid
                cursor.execute("""
                UPDATE role_master SET role_name=?, description=?, status=?
                WHERE role_id=?
                """, (data.get("role_name"), data.get("description", ""), data.get("status", "Active"), rid))
                conn.commit()
                self._send_json(data)
                return

            # PUT /api/expenses/:id
            m = re.match(r"^/api/expenses/([^/]+)$", path)
            if m:
                eid = m.group(1)
                data["expense_id"] = eid
                cursor.execute("""
                UPDATE expense_master SET project_id=?, project_item_id=?, expense_date=?, expense_category_id=?, description=?, vendor_id=?, quantity=?, unit=?, rate=?, amount=?, payment_status=?, payment_mode=?, attachment=?, reference_number=?, remarks=?, created_by=?
                WHERE expense_id=?
                """, (
                    data.get("project_id"),
                    data.get("project_item_id"),
                    data.get("expense_date"),
                    data.get("expense_category_id"),
                    data.get("description", ""),
                    data.get("vendor_id"),
                    float(data.get("quantity")) if data.get("quantity") is not None else None,
                    data.get("unit"),
                    float(data.get("rate")) if data.get("rate") is not None else None,
                    float(data.get("amount", 0)),
                    data.get("payment_status", "Paid"),
                    data.get("payment_mode", "Bank"),
                    data.get("attachment", ""),
                    data.get("reference_number", ""),
                    data.get("remarks", ""),
                    data.get("created_by", ""),
                    eid
                ))
                conn.commit()
                self._send_json(data)
                return

            self._send_error(f"PUT route not found: {path}", 404)
        finally:
            conn.close()

    def do_DELETE(self):
        path = urlparse(self.path).path
        conn = get_db()
        cursor = conn.cursor()

        try:
            # Delete routes mapping
            patterns = [
                (r"^/api/clients/([^/]+)$", "client_master", "client_id"),
                (r"^/api/projects/([^/]+)$", "project_master", "project_id"),
                (r"^/api/item-types/([^/]+)$", "item_type_master", "item_type_id"),
                (r"^/api/items/([^/]+)$", "item_master", "item_id"),
                (r"^/api/expense-categories/([^/]+)$", "expense_category_master", "expense_category_id"),
                (r"^/api/vendors/([^/]+)$", "vendor_master", "id"),
                (r"^/api/users/([^/]+)$", "user_master", "user_id"),
                (r"^/api/roles/([^/]+)$", "role_master", "role_id"),
                (r"^/api/user-roles/([^/]+)$", "user_role_mapping", "user_roles_id"),
                (r"^/api/expenses/([^/]+)$", "expense_master", "expense_id"),
            ]

            for pat, tbl, col in patterns:
                m = re.match(pat, path)
                if m:
                    target_id = m.group(1)
                    cursor.execute(f"DELETE FROM {tbl} WHERE {col} = ?", (target_id,))
                    conn.commit()
                    self._send_json({"success": True, "deletedId": target_id, "table": tbl})
                    return

            self._send_error(f"DELETE route not found: {path}", 404)
        finally:
            conn.close()

def run_server():
    init_db()
    server_address = ("127.0.0.1", PYTHON_PORT)
    httpd = HTTPServer(server_address, ERPHTTPRequestHandler)
    print(f"[Nexora ERP] Python 3.10 Backend running on http://127.0.0.1:{PYTHON_PORT}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
        print("[Nexora ERP] Python backend server stopped.", flush=True)

if __name__ == "__main__":
    run_server()
