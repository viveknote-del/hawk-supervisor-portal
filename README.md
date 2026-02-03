# 🦅 Hawk Security - Supervisor Reporting Portal v2.0

A web-accessible monthly reporting system for Hawk Security Services supervisors and management.

## ✅ Tested & Ready to Deploy

All API endpoints tested and working:
- ✅ User authentication (login/register)
- ✅ Sites management
- ✅ Employees management  
- ✅ Report submission
- ✅ Management dashboard
- ✅ Data backup/export

---

## 🚀 Deployment Options

### Option 1: Render.com (FREE - Recommended)

1. Go to [render.com](https://render.com) and sign up
2. Click **"New" → "Web Service"**
3. Choose **"Upload Files"** or connect GitHub
4. Upload the project files
5. Configure:
   - **Name**: `hawk-supervisor-portal`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Click **"Create Web Service"**
7. Your portal will be live at: `https://hawk-supervisor-portal.onrender.com`

### Option 2: Railway.app (FREE)

1. Go to [railway.app](https://railway.app) and sign up
2. Click **"New Project" → "Deploy from GitHub"** or upload
3. It auto-detects Node.js and deploys
4. Get your public URL from the dashboard

### Option 3: Heroku

```bash
# Install Heroku CLI first
heroku login
heroku create hawk-supervisor-portal
git init
git add .
git commit -m "Initial commit"
git push heroku main
```

### Option 4: Your Own Server (VPS)

```bash
# On your Ubuntu/Debian server:
sudo apt update && sudo apt install -y nodejs npm

# Upload files to server (via FTP/SCP/etc)
cd /var/www/hawk-supervisor-portal

# Install dependencies
npm install

# Run with PM2 (production process manager)
npm install -g pm2
pm2 start server.js --name "hawk-portal"
pm2 save
pm2 startup

# Server runs on port 3000
# Use Nginx to proxy to your domain
```

### Option 5: Local Testing

```bash
npm install
npm start
# Open http://localhost:3000
```

---

## 👥 Default Login Credentials

| Role | Employee ID | Password | Access Level |
|------|-------------|----------|--------------|
| Supervisor | SUP001 | hawk123 | Submit reports |
| Supervisor | SUP002 | hawk123 | Submit reports |
| Supervisor | SUP003 | hawk123 | Submit reports |
| Manager | MGR001 | manager123 | View all reports |
| Admin | ADMIN | admin123 | Full access |

---

## 📊 Features

### For Supervisors
- Login with Employee ID & Password
- Submit 10 monthly report types
- 5-step guided form (Mood → Data → KPIs → Summary → Review)
- AI-generated insights
- View submission history

### For Management (MGR001/ADMIN)
- **Management Dashboard** tab visible
- View ALL supervisors' reports
- Track who submitted / who's pending
- Export all data as backup
- Real-time statistics

---

## 📝 10 Report Types

1. 🏢 Site Visit Tracker
2. ⭐ Customer Feedback
3. 💰 Collection Report
4. 📈 Sales Leads
5. 🌙 Night Patrolling
6. 🎓 Training Summary
7. ⚠️ Complaints Log
8. 🏠 Accommodation Inspection
9. 👥 Mobilization Report
10. 🛡️ Disciplinary Actions

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/sites` | Get all sites |
| POST | `/api/sites/bulk` | Bulk import sites |
| GET | `/api/employees` | Get all employees |
| POST | `/api/employees/bulk` | Bulk import employees |
| GET | `/api/reports` | Get reports (filters: month, year, supervisorId) |
| POST | `/api/reports` | Submit new report |
| GET | `/api/reports/stats` | Get statistics (for management) |
| GET | `/api/backup` | Export all data |
| GET | `/api/users` | Get all users |

---

## 💾 Data Storage

Data is stored in `hawk_data.json` file:
- Users (supervisors, managers, admins)
- Sites (7 default sites)
- Employees (8 default employees)
- Submitted reports

---

## 🌐 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| NODE_ENV | development | Environment |

---

## 📁 Project Structure

```
hawk-supervisor-portal/
├── server.js          # Express API server
├── package.json       # Dependencies
├── hawk_data.json     # Database (auto-created)
├── public/
│   └── index.html     # Frontend application
└── README.md          # This file
```

---

## 🔒 Security Notes

- Passwords are hashed with bcrypt
- Session managed client-side (sessionStorage)
- For production, consider adding:
  - JWT tokens
  - HTTPS (handled by hosting platform)
  - Rate limiting

---

## 📞 Support

© 2026 Hawk Security Services LLC  
Website: [www.hawksecurityservice.com](https://www.hawksecurityservice.com)

---

## 🎉 Quick Start Summary

```bash
# 1. Extract zip file
# 2. Open terminal in folder
npm install
npm start
# 3. Open http://localhost:3000
# 4. Login with SUP001 / hawk123
```

That's it! Your portal is running. 🦅
