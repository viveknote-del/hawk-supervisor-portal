/**
 * HAWK SECURITY SERVICES - Supervisor Portal v4
 * Daily Entry System with Day/Week/Month Views
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
app.use(express.json({ limit: '50mb' }));

// Static files
if (fs.existsSync(path.join(__dirname, 'public'))) {
  app.use(express.static(path.join(__dirname, 'public')));
} else {
  app.use(express.static(__dirname));
}

// ===== DATABASE =====
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (err) { console.log('Creating new database...'); }
  return initDB();
}

function saveDB(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    return true;
  } catch (err) { console.error('Save error:', err); return false; }
}

function initDB() {
  const db = {
    users: [
      { id: 1, empId: 'SUP001', name: 'Yuvaraj', role: 'Operations Supervisor', password: bcrypt.hashSync('hawk123', 10), isAdmin: false },
      { id: 2, empId: 'SUP002', name: 'Ahmed Hassan', role: 'Senior Supervisor', password: bcrypt.hashSync('hawk123', 10), isAdmin: false },
      { id: 3, empId: 'SUP003', name: 'Mohammed Ali', role: 'Supervisor', password: bcrypt.hashSync('hawk123', 10), isAdmin: false },
      { id: 4, empId: 'MGR001', name: 'Management', role: 'Operations Manager', password: bcrypt.hashSync('manager123', 10), isAdmin: true },
      { id: 5, empId: 'ADMIN', name: 'Administrator', role: 'Admin', password: bcrypt.hashSync('admin123', 10), isAdmin: true }
    ],
    sites: [],
    employees: [],
    entries: [],
    nextIds: { users: 6, sites: 1, employees: 1, entries: 1 }
  };
  saveDB(db);
  return db;
}

let db = loadDB();

// ===== API ROUTES =====

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '4.0.0', timestamp: new Date().toISOString() });
});

// AUTH
app.post('/api/auth/login', (req, res) => {
  const { empId, password } = req.body;
  if (!empId || !password) return res.status(400).json({ error: 'Credentials required' });
  const user = db.users.find(u => u.empId.toUpperCase() === empId.toUpperCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ success: true, user: { id: user.id, empId: user.empId, name: user.name, role: user.role, isAdmin: user.isAdmin } });
});

// SITES
app.get('/api/sites', (req, res) => res.json(db.sites));

app.post('/api/sites/import', (req, res) => {
  const { sites, replace } = req.body;
  if (!Array.isArray(sites)) return res.status(400).json({ error: 'Sites must be array' });
  if (replace) { db.sites = []; db.nextIds.sites = 1; }
  
  let imported = 0;
  sites.forEach(s => {
    const siteId = s.siteId || s.id || `SITE${String(db.nextIds.sites).padStart(3, '0')}`;
    const name = s.name || s.Name || s.clientName || '';
    if (!name) return;
    
    const existing = db.sites.findIndex(x => x.siteId === siteId);
    const siteData = { 
      siteId, 
      name, 
      location: s.location || s.Location || '', 
      contactPerson: s.contactPerson || s['Contact Person'] || '',
      manningRequired: s.manningRequired || s.manning || ''
    };
    
    if (existing >= 0) db.sites[existing] = { ...db.sites[existing], ...siteData };
    else { db.sites.push({ id: db.nextIds.sites++, ...siteData }); }
    imported++;
  });
  
  saveDB(db);
  res.json({ success: true, imported, total: db.sites.length });
});

app.delete('/api/sites/all', (req, res) => {
  db.sites = []; db.nextIds.sites = 1; saveDB(db);
  res.json({ success: true });
});

// EMPLOYEES
app.get('/api/employees', (req, res) => res.json(db.employees));

app.post('/api/employees/import', (req, res) => {
  const { employees, replace } = req.body;
  if (!Array.isArray(employees)) return res.status(400).json({ error: 'Employees must be array' });
  if (replace) { db.employees = []; db.nextIds.employees = 1; }
  
  let imported = 0;
  employees.forEach(e => {
    const empId = e.empId || e.id || `EMP${String(db.nextIds.employees).padStart(3, '0')}`;
    const name = e.name || e.Name || '';
    if (!name) return;
    
    const existing = db.employees.findIndex(x => x.empId === empId);
    const empData = { 
      empId, 
      name, 
      type: e.type || e.designation || e.Designation || 'Guard',
      siteId: e.siteId || e.site || '',
      status: e.status || 'Active'
    };
    
    if (existing >= 0) db.employees[existing] = { ...db.employees[existing], ...empData };
    else { db.employees.push({ id: db.nextIds.employees++, ...empData }); }
    imported++;
  });
  
  saveDB(db);
  res.json({ success: true, imported, total: db.employees.length });
});

app.delete('/api/employees/all', (req, res) => {
  db.employees = []; db.nextIds.employees = 1; saveDB(db);
  res.json({ success: true });
});

// DAILY ENTRIES
app.get('/api/entries', (req, res) => {
  let entries = [...db.entries];
  const { supervisorId, reportType, from, to, date } = req.query;
  
  if (supervisorId) entries = entries.filter(e => e.supervisorId?.toUpperCase() === supervisorId.toUpperCase());
  if (reportType) entries = entries.filter(e => e.reportType === reportType);
  if (date) entries = entries.filter(e => e.date === date);
  if (from) entries = entries.filter(e => e.date >= from);
  if (to) entries = entries.filter(e => e.date <= to);
  
  entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(entries);
});

app.post('/api/entries', (req, res) => {
  const { reportType, reportName, date, supervisorId, supervisorName, data } = req.body;
  
  if (!reportType || !date || !supervisorId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const entry = {
    id: db.nextIds.entries++,
    reportType,
    reportName,
    date,
    supervisorId: supervisorId.toUpperCase(),
    supervisorName,
    data: data || {},
    createdAt: new Date().toISOString()
  };
  
  db.entries.push(entry);
  saveDB(db);
  
  console.log(`Entry saved: ${reportType} by ${supervisorName} for ${date}`);
  res.json({ success: true, entryId: entry.id });
});

app.delete('/api/entries/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = db.entries.findIndex(e => e.id === id);
  if (index >= 0) {
    db.entries.splice(index, 1);
    saveDB(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Entry not found' });
  }
});

// STATS
app.get('/api/stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);
  
  const stats = {
    totalEntries: db.entries.length,
    todayEntries: db.entries.filter(e => e.date === today).length,
    monthEntries: db.entries.filter(e => e.date?.startsWith(thisMonth)).length,
    totalSites: db.sites.length,
    totalEmployees: db.employees.length,
    byReportType: {},
    bySupervisor: {}
  };
  
  db.entries.forEach(e => {
    stats.byReportType[e.reportType] = (stats.byReportType[e.reportType] || 0) + 1;
    if (!stats.bySupervisor[e.supervisorId]) {
      stats.bySupervisor[e.supervisorId] = { name: e.supervisorName, count: 0 };
    }
    stats.bySupervisor[e.supervisorId].count++;
  });
  
  res.json(stats);
});

// BACKUP
app.get('/api/backup', (req, res) => {
  res.json({
    version: '4.0.0',
    exportDate: new Date().toISOString(),
    data: {
      sites: db.sites,
      employees: db.employees,
      entries: db.entries
    }
  });
});

// USERS
app.get('/api/users', (req, res) => {
  res.json(db.users.map(u => ({ id: u.id, empId: u.empId, name: u.name, role: u.role, isAdmin: u.isAdmin })));
});

// Catch-all
app.get('*', (req, res) => {
  const publicPath = path.join(__dirname, 'public', 'index.html');
  const rootPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(publicPath)) res.sendFile(publicPath);
  else if (fs.existsSync(rootPath)) res.sendFile(rootPath);
  else res.status(404).send('Not found');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🦅 Hawk Security Portal v4.0 running on port ${PORT}`);
  console.log(`   Sites: ${db.sites.length}, Employees: ${db.employees.length}, Entries: ${db.entries.length}`);
});

process.on('SIGTERM', () => { saveDB(db); process.exit(0); });
process.on('SIGINT', () => { saveDB(db); process.exit(0); });
