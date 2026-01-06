"""
Linac QA Management System - FastAPI Application
Main entry point and route definitions.
"""

import os
import json
from datetime import datetime, date, timedelta
from typing import Optional

from fastapi import FastAPI, Request, Depends, Form, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from database import get_db, init_db, backup_database, list_backups, export_to_json
from models import User, Unit, QAReport, QATest, OutputReading, AuditLog, SASQART_TESTS
from auth import (
    hash_password, verify_password, create_session_token, 
    get_current_user, create_default_admin, log_audit,
    SESSION_COOKIE_NAME
)

# Initialize FastAPI app
app = FastAPI(
    title="Linac QA Management System",
    description="Quality Assurance management for medical linear accelerators",
    version="1.0.0"
)

# Setup directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")

os.makedirs(TEMPLATES_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "css"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "js"), exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Setup Jinja2 templates
templates = Jinja2Templates(directory=TEMPLATES_DIR)


# =============================================================================
# STARTUP EVENTS
# =============================================================================

@app.on_event("startup")
async def startup():
    """Initialize database and default data on startup."""
    init_db()
    db = next(get_db())
    create_default_admin(db)
    create_default_units(db)
    db.close()


def create_default_units(db: Session):
    """Create default linac units if none exist."""
    if db.query(Unit).count() == 0:
        default_units = [
            Unit(
                name="Linac 1",
                manufacturer="Varian",
                model="Clinac",
                photon_energies=["6MV", "15MV"],
                electron_energies=["6MeV", "9MeV", "12MeV", "15MeV"],
                fff_energies=[]
            ),
            Unit(
                name="TrueBeam",
                manufacturer="Varian",
                model="TrueBeam",
                photon_energies=["6MV", "10MV", "15MV"],
                electron_energies=["6MeV", "9MeV", "12MeV", "15MeV", "18MeV"],
                fff_energies=["6MV FFF", "10MV FFF"]
            ),
        ]
        for unit in default_units:
            db.add(unit)
        db.commit()
        print("Default units created")


# =============================================================================
# AUTHENTICATION ROUTES
# =============================================================================

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    """Display login page."""
    return templates.TemplateResponse("login.html", {"request": request})


@app.post("/login")
async def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Process login form."""
    user = db.query(User).filter(User.username == username).first()
    
    if not user or not verify_password(password, user.hashed_password):
        return templates.TemplateResponse(
            "login.html", 
            {"request": request, "error": "Invalid username or password"}
        )
    
    if not user.active:
        return templates.TemplateResponse(
            "login.html",
            {"request": request, "error": "Account is disabled"}
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create session
    token = create_session_token(user.id, user.username)
    
    # Log audit
    log_audit(db, user.username, "LOGIN", f"User logged in", request.client.host)
    
    response = RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=12 * 3600,  # 12 hours
        samesite="lax"
    )
    return response


@app.get("/logout")
async def logout(request: Request, db: Session = Depends(get_db)):
    """Log out current user."""
    user = get_current_user(request, db)
    if user:
        log_audit(db, user.username, "LOGOUT", "User logged out", request.client.host)
    
    response = RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    response.delete_cookie(SESSION_COOKIE_NAME)
    return response


# =============================================================================
# MAIN PAGES
# =============================================================================

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request, db: Session = Depends(get_db)):
    """Main dashboard page."""
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    
    # Get summary statistics
    units = db.query(Unit).filter(Unit.active == True).all()
    today = date.today()
    
    # Recent reports
    recent_reports = db.query(QAReport).order_by(QAReport.created_at.desc()).limit(10).all()
    
    # QA due status
    qa_status = []
    for unit in units:
        last_daily = db.query(QAReport).filter(
            QAReport.unit_id == unit.id,
            QAReport.qa_type == "daily"
        ).order_by(QAReport.date.desc()).first()
        
        last_monthly = db.query(QAReport).filter(
            QAReport.unit_id == unit.id,
            QAReport.qa_type == "monthly"
        ).order_by(QAReport.date.desc()).first()
        
        qa_status.append({
            "unit": unit,
            "last_daily": last_daily.date if last_daily else None,
            "last_monthly": last_monthly.date if last_monthly else None,
            "daily_due": not last_daily or last_daily.date < today,
            "monthly_due": not last_monthly or (today - last_monthly.date).days > 30
        })
    
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "user": user,
        "units": units,
        "recent_reports": recent_reports,
        "qa_status": qa_status,
        "today": today
    })


@app.get("/qa/{qa_type}", response_class=HTMLResponse)
async def qa_form(
    request: Request,
    qa_type: str,
    unit_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Display QA entry form."""
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    
    if qa_type not in SASQART_TESTS:
        raise HTTPException(status_code=404, detail="Invalid QA type")
    
    units = db.query(Unit).filter(Unit.active == True).all()
    selected_unit = None
    if unit_id:
        selected_unit = db.query(Unit).filter(Unit.id == unit_id).first()
    
    tests = SASQART_TESTS[qa_type]
    
    return templates.TemplateResponse("qa_form.html", {
        "request": request,
        "user": user,
        "qa_type": qa_type,
        "tests": tests,
        "units": units,
        "selected_unit": selected_unit,
        "today": date.today().isoformat()
    })


@app.post("/qa/{qa_type}")
async def save_qa_report(
    request: Request,
    qa_type: str,
    db: Session = Depends(get_db)
):
    """Save QA report."""
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    
    form_data = await request.form()
    
    # Create report
    report = QAReport(
        date=datetime.strptime(form_data.get("qa_date"), "%Y-%m-%d").date(),
        qa_type=qa_type,
        unit_id=int(form_data.get("unit_id")),
        performer=form_data.get("performer"),
        witness=form_data.get("witness", ""),
        comments=form_data.get("comments", ""),
        signature=form_data.get("signature", ""),
        created_by=user.id
    )
    db.add(report)
    db.flush()  # Get report ID
    
    # Save individual tests
    for test_def in SASQART_TESTS[qa_type]:
        test_id = test_def["id"]
        test = QATest(
            report_id=report.id,
            test_id=test_id,
            status=form_data.get(f"status_{test_id}", ""),
            notes=form_data.get(f"notes_{test_id}", "")
        )
        db.add(test)
    
    db.commit()
    
    # Log audit
    unit = db.query(Unit).filter(Unit.id == report.unit_id).first()
    log_audit(
        db, user.username, "SAVE_QA",
        f"{qa_type.upper()} QA saved for {unit.name} on {report.date}",
        request.client.host
    )
    
    return RedirectResponse(url="/history", status_code=status.HTTP_303_SEE_OTHER)


@app.get("/history", response_class=HTMLResponse)
async def history_page(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    qa_type: Optional[str] = None,
    unit_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Display QA history."""
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    
    # Default date range: last 30 days
    if not end_date:
        end_date = date.today().isoformat()
    if not start_date:
        start_date = (date.today() - timedelta(days=30)).isoformat()
    
    # Build query
    query = db.query(QAReport)
    
    if start_date:
        query = query.filter(QAReport.date >= start_date)
    if end_date:
        query = query.filter(QAReport.date <= end_date)
    if qa_type and qa_type != "all":
        query = query.filter(QAReport.qa_type == qa_type)
    if unit_id:
        query = query.filter(QAReport.unit_id == unit_id)
    
    reports = query.order_by(QAReport.date.desc()).all()
    units = db.query(Unit).filter(Unit.active == True).all()
    
    return templates.TemplateResponse("history.html", {
        "request": request,
        "user": user,
        "reports": reports,
        "units": units,
        "start_date": start_date,
        "end_date": end_date,
        "selected_qa_type": qa_type or "all",
        "selected_unit_id": unit_id
    })


@app.get("/report/{report_id}", response_class=HTMLResponse)
async def view_report(
    request: Request,
    report_id: int,
    db: Session = Depends(get_db)
):
    """View a specific QA report."""
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    
    report = db.query(QAReport).filter(QAReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    tests_dict = {t["id"]: t for t in SASQART_TESTS[report.qa_type]}
    
    return templates.TemplateResponse("report_view.html", {
        "request": request,
        "user": user,
        "report": report,
        "tests_dict": tests_dict
    })


@app.get("/trends", response_class=HTMLResponse)
async def trends_page(
    request: Request,
    unit_id: Optional[int] = None,
    energy: Optional[str] = None,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Display output trends."""
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    
    units = db.query(Unit).filter(Unit.active == True).all()
    
    # Get trend data
    trend_data = []
    if unit_id and energy:
        start_date = date.today() - timedelta(days=days)
        readings = db.query(OutputReading).filter(
            OutputReading.unit_id == unit_id,
            OutputReading.energy == energy,
            OutputReading.date >= start_date
        ).order_by(OutputReading.date).all()
        
        trend_data = [
            {"date": r.date.isoformat(), "deviation": r.deviation}
            for r in readings
        ]
    
    return templates.TemplateResponse("trends.html", {
        "request": request,
        "user": user,
        "units": units,
        "selected_unit_id": unit_id,
        "selected_energy": energy,
        "days": days,
        "trend_data": json.dumps(trend_data)
    })


@app.get("/units", response_class=HTMLResponse)
async def units_page(request: Request, db: Session = Depends(get_db)):
    """Display unit configuration."""
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    
    units = db.query(Unit).all()
    
    return templates.TemplateResponse("units.html", {
        "request": request,
        "user": user,
        "units": units
    })


@app.post("/units")
async def save_unit(
    request: Request,
    db: Session = Depends(get_db)
):
    """Save unit configuration."""
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    
    form_data = await request.form()
    unit_id = form_data.get("unit_id")
    
    if unit_id and unit_id != "new":
        unit = db.query(Unit).filter(Unit.id == int(unit_id)).first()
    else:
        unit = Unit()
        db.add(unit)
    
    unit.name = form_data.get("name")
    unit.manufacturer = form_data.get("manufacturer")
    unit.model = form_data.get("model")
    unit.serial_number = form_data.get("serial_number")
    unit.location = form_data.get("location")
    
    install_date = form_data.get("install_date")
    if install_date:
        unit.install_date = datetime.strptime(install_date, "%Y-%m-%d").date()
    
    # Parse energy lists
    unit.photon_energies = [e.strip() for e in form_data.get("photon_energies", "").split(",") if e.strip()]
    unit.electron_energies = [e.strip() for e in form_data.get("electron_energies", "").split(",") if e.strip()]
    unit.fff_energies = [e.strip() for e in form_data.get("fff_energies", "").split(",") if e.strip()]
    
    db.commit()
    
    log_audit(
        db, user.username, "SAVE_UNIT",
        f"Unit configuration saved: {unit.name} (S/N: {unit.serial_number})",
        request.client.host
    )
    
    return RedirectResponse(url="/units", status_code=status.HTTP_303_SEE_OTHER)


# =============================================================================
# ADMIN ROUTES
# =============================================================================

@app.get("/admin/users", response_class=HTMLResponse)
async def users_page(request: Request, db: Session = Depends(get_db)):
    """User management page (admin only)."""
    user = get_current_user(request, db)
    if not user or user.role != "admin":
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    
    users = db.query(User).all()
    
    return templates.TemplateResponse("users.html", {
        "request": request,
        "user": user,
        "users": users
    })


@app.post("/admin/users")
async def save_user(request: Request, db: Session = Depends(get_db)):
    """Create or update user."""
    current_user = get_current_user(request, db)
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    form_data = await request.form()
    user_id = form_data.get("user_id")
    
    if user_id and user_id != "new":
        user = db.query(User).filter(User.id == int(user_id)).first()
    else:
        user = User()
        db.add(user)
    
    user.username = form_data.get("username")
    user.email = form_data.get("email")
    user.full_name = form_data.get("full_name")
    user.role = form_data.get("role")
    user.active = form_data.get("active") == "on"
    
    password = form_data.get("password")
    if password:
        user.hashed_password = hash_password(password)
    
    db.commit()
    
    log_audit(
        db, current_user.username, "SAVE_USER",
        f"User saved: {user.username}",
        request.client.host
    )
    
    return RedirectResponse(url="/admin/users", status_code=status.HTTP_303_SEE_OTHER)


@app.get("/admin/audit", response_class=HTMLResponse)
async def audit_page(request: Request, db: Session = Depends(get_db)):
    """Audit log page (admin only)."""
    user = get_current_user(request, db)
    if not user or user.role != "admin":
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(200).all()
    
    return templates.TemplateResponse("audit.html", {
        "request": request,
        "user": user,
        "logs": logs
    })


@app.get("/admin/backup")
async def create_backup(request: Request, db: Session = Depends(get_db)):
    """Create database backup."""
    user = get_current_user(request, db)
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    backup_path = backup_database()
    log_audit(db, user.username, "BACKUP", f"Database backup created: {backup_path}", request.client.host)
    
    return RedirectResponse(url="/admin/audit", status_code=status.HTTP_303_SEE_OTHER)


@app.get("/admin/export")
async def export_data(request: Request, db: Session = Depends(get_db)):
    """Export all data as JSON."""
    user = get_current_user(request, db)
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    data = export_to_json()
    log_audit(db, user.username, "EXPORT", "Full database export", request.client.host)
    
    return JSONResponse(content=data, headers={
        "Content-Disposition": f"attachment; filename=linac_qa_export_{date.today().isoformat()}.json"
    })


# =============================================================================
# API ENDPOINTS (for AJAX calls)
# =============================================================================

@app.get("/api/unit/{unit_id}")
async def get_unit_api(unit_id: int, db: Session = Depends(get_db)):
    """Get unit details as JSON."""
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    return {
        "id": unit.id,
        "name": unit.name,
        "manufacturer": unit.manufacturer,
        "model": unit.model,
        "serial_number": unit.serial_number,
        "location": unit.location,
        "photon_energies": unit.photon_energies,
        "electron_energies": unit.electron_energies,
        "fff_energies": unit.fff_energies
    }


@app.post("/api/output-reading")
async def save_output_reading(request: Request, db: Session = Depends(get_db)):
    """Save an output reading for trend tracking."""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    data = await request.json()
    
    reading = OutputReading(
        date=datetime.strptime(data["date"], "%Y-%m-%d").date(),
        unit_id=data["unit_id"],
        energy=data["energy"],
        reading=data["reading"],
        reference=data["reference"],
        deviation=((data["reading"] - data["reference"]) / data["reference"]) * 100
    )
    db.add(reading)
    db.commit()
    
    return {"status": "ok", "id": reading.id, "deviation": reading.deviation}


# =============================================================================
# RUN SERVER
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("Linac QA Management System")
    print("=" * 60)
    print(f"Starting server at http://localhost:8000")
    print(f"Database: {os.path.join(BASE_DIR, 'data', 'linac_qa.db')}")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
