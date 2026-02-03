/**
 * HAWK SECURITY SERVICES - Supervisor Reporting Portal v3.0
 * WITH IMPORT FUNCTIONALITY FOR SITES & EMPLOYEES
 * Updated Report Formats Based on Company Templates
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = process.env.NODE_ENV === 'production' ? '/tmp' : __dirname;
const DB_FILE = path.join(DATA_DIR, 'hawk_data.json');

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased for bulk imports

// Serve static files
if (fs.existsSync(path.join(__dirname, 'public'))) {
  app.use(express.static(path.join(__dirname, 'public')));
} else {
  app.use(express.static(__dirname));
}

// ==================== DATABASE FUNCTIONS ====================

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.log('Creating new database...');
  }
  return initDB();
}

function saveDB(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving database:', err);
    return false;
  }
}

function initDB() {
  const db = {
    users: [
      { id: 1, empId: 'SUP001', name: 'Yuvaraj', role: 'Operations Supervisor', password: bcrypt.hashSync('hawk123', 10), isAdmin: false, createdAt: new Date().toISOString() },
      { id: 2, empId: 'SUP002', name: 'Ahmed Hassan', role: 'Senior Supervisor', password: bcrypt.hashSync('hawk123', 10), isAdmin: false, createdAt: new Date().toISOString() },
      { id: 3, empId: 'SUP003', name: 'Mohammed Ali', role: 'Supervisor', password: bcrypt.hashSync('hawk123', 10), isAdmin: false, createdAt: new Date().toISOString() },
      { id: 4, empId: 'ADMIN', name: 'Administrator', role: 'Admin', password: bcrypt.hashSync('admin123', 10), isAdmin: true, createdAt: new Date().toISOString() },
      { id: 5, empId: 'MGR001', name: 'Management', role: 'Operations Manager', password: bcrypt.hashSync('manager123', 10), isAdmin: true, createdAt: new Date().toISOString() }
    ],
    sites: [],
    employees: [],
    reports: [],
    nextIds: { users: 6, sites: 1, employees: 1, reports: 1 }
  };
  saveDB(db);
  console.log('Database initialized');
  return db;
}

let db = loadDB();

// ==================== API ROUTES ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0', timestamp: new Date().toISOString() });
});

// AUTH: Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { empId, password } = req.body;
    if (!empId || !password) return res.status(400).json({ error: 'Employee ID and password required' });
    const user = db.users.find(u => u.empId.toUpperCase() === empId.toUpperCase());
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
    console.log(`User logged in: ${user.name}`);
    res.json({ success: true, user: { id: user.id, empId: user.empId, name: user.name, role: user.role, isAdmin: user.isAdmin } });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// AUTH: Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { empId, name, role, password } = req.body;
    if (!empId || !name || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const existing = db.users.find(u => u.empId.toUpperCase() === empId.toUpperCase());
    if (existing) return res.status(400).json({ error: 'Employee ID already exists' });
    const newUser = { id: db.nextIds.users++, empId: empId.toUpperCase(), name, role: role || 'Supervisor', password: bcrypt.hashSync(password, 10), isAdmin: false, createdAt: new Date().toISOString() };
    db.users.push(newUser);
    saveDB(db);
    res.json({ success: true, userId: newUser.id });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ==================== SITES ====================

app.get('/api/sites', (req, res) => {
  try { 
    res.json(db.sites.map(s => ({ 
      id: s.siteId || s.id, 
      siteId: s.siteId || s.id,
      name: s.name || s.clientName, 
      client: s.client || s.clientName, 
      location: s.location || s.address,
      type: s.type,
      contactPerson: s.contactPerson,
      manningRequired: s.manningRequired
    }))); 
  }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// SITES: Add single
app.post('/api/sites', (req, res) => {
  try {
    const { siteId, name, client, location, type, contactPerson, manningRequired } = req.body;
    const id = siteId || `SITE${String(db.nextIds.sites).padStart(3, '0')}`;
    const existing = db.sites.findIndex(s => (s.siteId || s.id) === id);
    if (existing >= 0) {
      db.sites[existing] = { ...db.sites[existing], name, client, location, type, contactPerson, manningRequired };
    } else {
      db.sites.push({ id: db.nextIds.sites++, siteId: id, name, client, location, type, contactPerson, manningRequired });
    }
    saveDB(db);
    res.json({ success: true, siteId: id });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// SITES: Bulk import (CSV/JSON format)
app.post('/api/sites/import', (req, res) => {
  try {
    const { sites, replace } = req.body;
    if (!Array.isArray(sites)) return res.status(400).json({ error: 'Sites must be an array' });
    
    if (replace) {
      db.sites = [];
      db.nextIds.sites = 1;
    }
    
    let imported = 0;
    for (const s of sites) {
      const siteId = s.siteId || s.id || s.SiteID || s['Site ID'] || `SITE${String(db.nextIds.sites).padStart(3, '0')}`;
      const name = s.name || s.Name || s.clientName || s['Client Name'] || s.client || '';
      const client = s.client || s.Client || s.clientName || s['Client Name'] || name;
      const location = s.location || s.Location || s.address || s.Address || '';
      const type = s.type || s.Type || s['Type of Service'] || '';
      const contactPerson = s.contactPerson || s['Contact Person'] || '';
      const manningRequired = s.manningRequired || s['Manning Required'] || s.manning || '';
      
      if (!name) continue;
      
      const existing = db.sites.findIndex(x => (x.siteId || x.id) === siteId);
      if (existing >= 0) {
        db.sites[existing] = { ...db.sites[existing], siteId, name, client, location, type, contactPerson, manningRequired };
      } else {
        db.sites.push({ id: db.nextIds.sites++, siteId, name, client, location, type, contactPerson, manningRequired });
      }
      imported++;
    }
    
    saveDB(db);
    console.log(`Imported ${imported} sites`);
    res.json({ success: true, imported, total: db.sites.length });
  } catch (err) { 
    console.error('Import sites error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message }); 
  }
});

// SITES: Delete all
app.delete('/api/sites/all', (req, res) => {
  try {
    db.sites = [];
    db.nextIds.sites = 1;
    saveDB(db);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ==================== EMPLOYEES ====================

app.get('/api/employees', (req, res) => {
  try { 
    res.json(db.employees.map(e => ({ 
      id: e.empId || e.id, 
      empId: e.empId || e.id,
      name: e.name, 
      type: e.type || e.designation, 
      designation: e.type || e.designation,
      siteId: e.siteId, 
      site: e.site || e.siteId,
      status: e.status || 'Active',
      phone: e.phone,
      nationality: e.nationality
    }))); 
  }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// EMPLOYEES: Add single
app.post('/api/employees', (req, res) => {
  try {
    const { empId, name, type, designation, siteId, site, status, phone, nationality } = req.body;
    const id = empId || `EMP${String(db.nextIds.employees).padStart(3, '0')}`;
    const existing = db.employees.findIndex(e => (e.empId || e.id) === id);
    if (existing >= 0) {
      db.employees[existing] = { ...db.employees[existing], name, type: type || designation, siteId: siteId || site, status, phone, nationality };
    } else {
      db.employees.push({ id: db.nextIds.employees++, empId: id, name, type: type || designation, siteId: siteId || site, status: status || 'Active', phone, nationality });
    }
    saveDB(db);
    res.json({ success: true, empId: id });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// EMPLOYEES: Bulk import
app.post('/api/employees/import', (req, res) => {
  try {
    const { employees, replace } = req.body;
    if (!Array.isArray(employees)) return res.status(400).json({ error: 'Employees must be an array' });
    
    if (replace) {
      db.employees = [];
      db.nextIds.employees = 1;
    }
    
    let imported = 0;
    for (const e of employees) {
      const empId = e.empId || e.id || e.EmpID || e['Employee ID'] || e['Emp ID'] || `EMP${String(db.nextIds.employees).padStart(3, '0')}`;
      const name = e.name || e.Name || e['Employee Name'] || '';
      const type = e.type || e.Type || e.designation || e.Designation || e['Type of Service'] || 'Security Guard';
      const siteId = e.siteId || e.site || e.Site || e['Site ID'] || e.Location || '';
      const status = e.status || e.Status || 'Active';
      const phone = e.phone || e.Phone || e.Mobile || '';
      const nationality = e.nationality || e.Nationality || '';
      
      if (!name) continue;
      
      const existing = db.employees.findIndex(x => (x.empId || x.id) === empId);
      if (existing >= 0) {
        db.employees[existing] = { ...db.employees[existing], empId, name, type, siteId, status, phone, nationality };
      } else {
        db.employees.push({ id: db.nextIds.employees++, empId, name, type, siteId, status, phone, nationality });
      }
      imported++;
    }
    
    saveDB(db);
    console.log(`Imported ${imported} employees`);
    res.json({ success: true, imported, total: db.employees.length });
  } catch (err) { 
    console.error('Import employees error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message }); 
  }
});

// EMPLOYEES: Delete all
app.delete('/api/employees/all', (req, res) => {
  try {
    db.employees = [];
    db.nextIds.employees = 1;
    saveDB(db);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ==================== REPORTS ====================

app.get('/api/reports', (req, res) => {
  try {
    let { month, year, supervisorId, reportType } = req.query;
    let reports = [...db.reports];
    if (month) reports = reports.filter(r => r.periodMonth === parseInt(month));
    if (year) reports = reports.filter(r => r.periodYear === parseInt(year));
    if (supervisorId) reports = reports.filter(r => r.supervisorId.toUpperCase() === supervisorId.toUpperCase());
    if (reportType) reports = reports.filter(r => r.reportType === reportType);
    reports.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    res.json(reports);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/reports/stats', (req, res) => {
  try {
    const now = new Date();
    const m = parseInt(req.query.month) || (now.getMonth() + 1);
    const y = parseInt(req.query.year) || now.getFullYear();
    const monthReports = db.reports.filter(r => r.periodMonth === m && r.periodYear === y);
    const bySupervisor = {};
    monthReports.forEach(r => {
      if (!bySupervisor[r.supervisorId]) bySupervisor[r.supervisorId] = { name: r.supervisorName, reports: [] };
      bySupervisor[r.supervisorId].reports.push(r.reportType);
    });
    res.json({ 
      period: { month: m, year: y }, 
      totalReports: monthReports.length, 
      totalSupervisors: db.users.filter(u => !u.isAdmin).length, 
      totalSites: db.sites.length, 
      totalEmployees: db.employees.length, 
      bySupervisor, 
      reportTypes: [...new Set(monthReports.map(r => r.reportType))] 
    });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/reports', (req, res) => {
  try {
    const { reportType, period, supervisor, data } = req.body;
    if (!reportType || !period || !supervisor) return res.status(400).json({ error: 'Missing required fields' });
    const supervisorId = (supervisor.id || supervisor.empId || '').toUpperCase();
    const existing = db.reports.find(r => r.reportType === reportType && r.periodMonth === period.month && r.periodYear === period.year && r.supervisorId.toUpperCase() === supervisorId);
    if (existing) return res.status(400).json({ error: 'Report already submitted for this period' });
    
    const newReport = { 
      id: db.nextIds.reports++, 
      reportType, 
      periodMonth: period.month, 
      periodYear: period.year, 
      periodLabel: period.label, 
      supervisorId, 
      supervisorName: supervisor.name, 
      data: data || {},
      submittedAt: new Date().toISOString(), 
      version: '3.0.0' 
    };
    db.reports.push(newReport);
    saveDB(db);
    console.log(`Report submitted: ${reportType} by ${supervisor.name}`);
    res.json({ success: true, reportId: newReport.id });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/reports/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = db.reports.findIndex(r => r.id === id);
    if (index >= 0) { db.reports.splice(index, 1); saveDB(db); res.json({ success: true }); }
    else res.status(404).json({ error: 'Report not found' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ==================== BACKUP & EXPORT ====================

app.get('/api/backup', (req, res) => {
  try { 
    res.json({ 
      version: '3.0.0', 
      exportDate: new Date().toISOString(), 
      data: { 
        users: db.users.map(u => ({ empId: u.empId, name: u.name, role: u.role, isAdmin: u.isAdmin })), 
        sites: db.sites, 
        employees: db.employees, 
        reports: db.reports 
      } 
    }); 
  }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/users', (req, res) => {
  try { res.json(db.users.map(u => ({ id: u.id, empId: u.empId, name: u.name, role: u.role, isAdmin: u.isAdmin, createdAt: u.createdAt }))); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Catch-all for SPA
app.get('*', (req, res) => {
  const publicPath = path.join(__dirname, 'public', 'index.html');
  const rootPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(publicPath)) res.sendFile(publicPath);
  else if (fs.existsSync(rootPath)) res.sendFile(rootPath);
  else res.status(404).send('Frontend not found');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🦅 Hawk Security Portal v3.0 running on port ${PORT}`);
  console.log(`   Sites: ${db.sites.length}, Employees: ${db.employees.length}`);
});

process.on('SIGTERM', () => { saveDB(db); process.exit(0); });
process.on('SIGINT', () => { saveDB(db); process.exit(0); });
