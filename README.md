# Linac QA Management System

A portable, self-contained Quality Assurance management system for medical linear accelerators, built with FastAPI and SQLite.

## Features

- ✅ SASQART Table 24 compliant QA checklists (Daily, Monthly, Quarterly, Annual)
- ✅ Multi-unit support with individual energy configurations
- ✅ Equipment tracking with serial numbers
- ✅ Output trend analysis with charts
- ✅ PDF report generation
- ✅ User authentication
- ✅ Audit trail
- ✅ SAHPRA inspection package export
- ✅ Portable SQLite database (single file backup)
- ✅ Mobile-responsive design

## Requirements

- Python 3.8+
- No external database server needed (uses SQLite)

## Quick Start

```bash
# 1. Create virtual environment
python -m venv venv

# 2. Activate it
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the application
python main.py

# 5. Open browser to http://localhost:8000
```

## Default Login

- Username: `admin`
- Password: `changeme123`

**Change this immediately after first login!**

## File Structure

```
linac-qa-app/
├── main.py              # FastAPI application entry point
├── database.py          # Database connection and setup
├── models.py            # SQLAlchemy ORM models
├── auth.py              # Authentication utilities
├── requirements.txt     # Python dependencies
├── data/
│   └── linac_qa.db      # SQLite database (created on first run)
├── templates/
│   ├── base.html        # Base template with navigation
│   ├── login.html       # Login page
│   ├── dashboard.html   # Main dashboard
│   ├── qa_form.html     # QA entry form
│   ├── history.html     # Historical reports
│   ├── trends.html      # Output trends
│   ├── units.html       # Unit configuration
│   └── users.html       # User management (admin)
├── static/
│   ├── css/
│   │   └── style.css    # Custom styles
│   └── js/
│       └── app.js       # Frontend JavaScript
└── backups/             # Database backups stored here
```

## Backup & Restore

### Manual Backup
```bash
python -c "from database import backup_database; backup_database()"
```
Or use the "Backup Database" button in the admin panel.

### Restore from Backup
```bash
python -c "from database import restore_database; restore_database('backups/linac_qa_2024-01-15.db')"
```

### Automated Backups
The system automatically creates daily backups. Configure retention in `main.py`.

## Handover Instructions

When transferring this system to a new administrator:

1. Copy the entire `linac-qa-app` folder to the new location
2. Ensure Python 3.8+ is installed
3. Run `pip install -r requirements.txt`
4. Run `python main.py`
5. The database file `data/linac_qa.db` contains ALL data

The database is a single SQLite file - you can simply copy it for backup.

## Upgrading to PostgreSQL (Optional)

If you need multi-user concurrent access or want to connect to hospital infrastructure:

1. Install PostgreSQL
2. Update `DATABASE_URL` in `database.py`:
   ```python
   DATABASE_URL = "postgresql://user:password@localhost/linac_qa"
   ```
3. Install psycopg2: `pip install psycopg2-binary`
4. Run migrations: `python -c "from database import init_db; init_db()"`

## License

Internal use only - [Your Hospital Name]

## Support

Contact: [Your Name / Department]
