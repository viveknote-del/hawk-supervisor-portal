/**
 * HAWK SECURITY SERVICES - Supervisor Reporting Portal
 * Backend Server with JSON File Storage
 * Version 2.0.0
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
app.use(express.json({ limit: '10mb' }));

// Serve static files - check both public/ folder and root
if (fs.existsSync(path.join(__dirname, 'public'))) {
  app.use(express.static(path.join(__dirname, 'public')));
} else {
  app.use(express.static(__dirname));
}

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
      { id: 1, empId: 'SUP001', name: 'Yuvaraj', role: 'Supervisor', password: bcrypt.hashSync('hawk123', 10), isAdmin: false, createdAt: new Date().toISOString() },
      { id: 2, empId: 'SUP002', name: 'Ahmed Hassan', role: 'Senior Supervisor', password: bcrypt.hashSync('hawk123', 10), isAdmin: false, createdAt: new Date().toISOString() },
      { id: 3, empId: 'SUP003', name: 'Mohammed Ali', role: 'Supervisor', password: bcrypt.hashSync('hawk123', 10), isAdmin: false, createdAt: new Date().toISOString() },
      { id: 4, empId: 'ADMIN', name: 'Administrator', role: 'Admin', password: bcrypt.hashSync('admin123', 10), isAdmin: true, createdAt: new Date().toISOString() },
      { id: 5, empId: 'MGR001', name: 'Management', role: 'Manager', password: bcrypt.hashSync('manager123', 10), isAdmin: true, createdAt: new Date().toISOString() }
    ],
    sites: [
      { id: 1, siteId: 'SITE001', name: 'Dubai Mall', client: 'Emaar Properties', type: 'Mall', address: 'Downtown Dubai' },
      { id: 2, siteId: 'SITE002', name: 'Intercontinental Hotel', client: 'IHG Group', type: 'Hotel', address: 'Festival City' },
      { id: 3, siteId: 'SITE003', name: 'DIFC Tower 2', client: 'DIFC Authority', type: 'Commercial', address: 'DIFC' },
      { id: 4, siteId: 'SITE004', name: 'Al Barsha Residences', client: 'Wasl Properties', type: 'Residential', address: 'Al Barsha' },
      { id: 5, siteId: 'SITE005', name: 'Jebel Ali Industrial', client: 'JAFZA', type: 'Industrial', address: 'Jebel Ali' },
      { id: 6, siteId: 'SITE006', name: 'Marina Mall', client: 'Emaar', type: 'Mall', address: 'Dubai Marina' },
      { id: 7, siteId: 'SITE007', name: 'JBR Walk', client: 'Meraas', type: 'Commercial', address: 'JBR' }
    ],
    employees: [
      { id: 1, empId: 'EMP001', name: 'Ahmed Hassan', type: 'Security Guard', siteId: 'SITE001', status: 'Active' },
      { id: 2, empId: 'EMP002', name: 'Mohammed Ali', type: 'Security Guard', siteId: 'SITE001', status: 'Active' },
      { id: 3, empId: 'EMP003', name: 'Fatima Khan', type: 'Cleaner', siteId: 'SITE002', status: 'Active' },
      { id: 4, empId: 'EMP004', name: 'Raj Kumar', type: 'Supervisor', siteId: 'SITE003', status: 'Active' },
      { id: 5, empId: 'EMP005', name: 'Sarah Ahmed', type: 'Security Guard', siteId: 'SITE002', status: 'Active' },
      { id: 6, empId: 'EMP006', name: 'Omar Farooq', type: 'Security Guard', siteId: 'SITE004', status: 'Active' },
      { id: 7, empId: 'EMP007', name: 'Hassan Ali', type: 'Cleaner', siteId: 'SITE005', status: 'Active' },
      { id: 8, empId: 'EMP008', name: 'Aisha Begum', type: 'Security Guard', siteId: 'SITE006', status: 'Active' }
    ],
    reports: [],
    nextIds: { users: 6, sites: 8, employees: 9, reports: 1 }
  };
  saveDB(db);
  console.log('Database initialized');
  return db;
}

let db = loadDB();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

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

app.get('/api/sites', (req, res) => {
  try { res.json(db.sites.map(s => ({ id: s.siteId, name: s.name, client: s.client, type: s.type, address: s.address }))); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/sites/bulk', (req, res) => {
  try {
    const { sites } = req.body;
    for (const s of sites) {
      const siteId = s.id || s.siteId;
      const existing = db.sites.findIndex(x => x.siteId === siteId);
      if (existing >= 0) db.sites[existing] = { ...db.sites[existing], ...s, siteId };
      else db.sites.push({ id: db.nextIds.sites++, siteId, name: s.name, client: s.client || s.clientName, type: s.type, address: s.address });
    }
    saveDB(db);
    res.json({ success: true, count: sites.length });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/employees', (req, res) => {
  try { res.json(db.employees.map(e => ({ id: e.empId, name: e.name, type: e.type, siteId: e.siteId, status: e.status }))); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/employees/bulk', (req, res) => {
  try {
    const { employees } = req.body;
    for (const e of employees) {
      const empId = e.id || e.empId;
      const existing = db.employees.findIndex(x => x.empId === empId);
      if (existing >= 0) db.employees[existing] = { ...db.employees[existing], ...e, empId };
      else db.employees.push({ id: db.nextIds.employees++, empId, name: e.name, type: e.type || e.designation, siteId: e.siteId || e.assignedSite, status: e.status || 'Active' });
    }
    saveDB(db);
    res.json({ success: true, count: employees.length });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

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
    res.json({ period: { month: m, year: y }, totalReports: monthReports.length, totalSupervisors: db.users.filter(u => !u.isAdmin).length, totalSites: db.sites.length, totalEmployees: db.employees.length, bySupervisor, reportTypes: [...new Set(monthReports.map(r => r.reportType))] });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/reports', (req, res) => {
  try {
    const { reportType, period, supervisor, sentiment, entries, kpis, summary, insight } = req.body;
    if (!reportType || !period || !supervisor) return res.status(400).json({ error: 'Missing required fields' });
    const supervisorId = (supervisor.id || supervisor.empId || '').toUpperCase();
    const existing = db.reports.find(r => r.reportType === reportType && r.periodMonth === period.month && r.periodYear === period.year && r.supervisorId.toUpperCase() === supervisorId);
    if (existing) return res.status(400).json({ error: 'Report already submitted for this period' });
    const newReport = { id: db.nextIds.reports++, reportType, periodMonth: period.month, periodYear: period.year, periodLabel: period.label, supervisorId, supervisorName: supervisor.name, sentiment, entries, kpis, summary, insight, submittedAt: new Date().toISOString(), version: '2.0.0' };
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

app.get('/api/backup', (req, res) => {
  try { res.json({ version: '2.0.0', exportDate: new Date().toISOString(), data: { users: db.users.map(u => ({ empId: u.empId, name: u.name, role: u.role, isAdmin: u.isAdmin })), sites: db.sites, employees: db.employees, reports: db.reports } }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/users', (req, res) => {
  try { res.json(db.users.map(u => ({ id: u.id, empId: u.empId, name: u.name, role: u.role, isAdmin: u.isAdmin, createdAt: u.createdAt }))); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('*', (req, res) => {
  const publicPath = path.join(__dirname, 'public', 'index.html');
  const rootPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(publicPath)) res.sendFile(publicPath);
  else if (fs.existsSync(rootPath)) res.sendFile(rootPath);
  else res.status(404).send('Frontend not found');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🦅 Hawk Security Portal running on port ${PORT}`);
});

process.on('SIGTERM', () => { saveDB(db); process.exit(0); });
process.on('SIGINT', () => { saveDB(db); process.exit(0); });
