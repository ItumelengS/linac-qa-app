"""
Database configuration and utilities for Linac QA System.
Uses SQLite by default for portability. Can be switched to PostgreSQL.
"""

import os
import shutil
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Database configuration
# SQLite for portability - just a single file!
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
BACKUP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups")

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)

DATABASE_PATH = os.path.join(DATA_DIR, "linac_qa.db")
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# For PostgreSQL (if needed later), uncomment and modify:
# DATABASE_URL = "postgresql://username:password@localhost:5432/linac_qa"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False  # Set to True for SQL debugging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency for FastAPI routes to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    from models import User, Unit, QAReport, QATest, OutputReading, AuditLog
    Base.metadata.create_all(bind=engine)
    print(f"Database initialized at: {DATABASE_PATH}")


def backup_database(note: str = "") -> str:
    """
    Create a backup of the SQLite database.
    Returns the backup file path.
    """
    if "sqlite" not in DATABASE_URL:
        raise Exception("Backup function only works with SQLite. Use pg_dump for PostgreSQL.")
    
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_name = f"linac_qa_{timestamp}.db"
    if note:
        backup_name = f"linac_qa_{timestamp}_{note}.db"
    
    backup_path = os.path.join(BACKUP_DIR, backup_name)
    shutil.copy2(DATABASE_PATH, backup_path)
    
    print(f"Backup created: {backup_path}")
    return backup_path


def restore_database(backup_path: str) -> bool:
    """
    Restore database from a backup file.
    Creates a backup of current database first.
    """
    if not os.path.exists(backup_path):
        raise FileNotFoundError(f"Backup file not found: {backup_path}")
    
    # Backup current database before restoring
    backup_database(note="pre_restore")
    
    # Close all connections
    engine.dispose()
    
    # Replace database with backup
    shutil.copy2(backup_path, DATABASE_PATH)
    
    print(f"Database restored from: {backup_path}")
    return True


def list_backups() -> list:
    """List all available database backups."""
    backups = []
    for filename in os.listdir(BACKUP_DIR):
        if filename.endswith(".db"):
            filepath = os.path.join(BACKUP_DIR, filename)
            stat = os.stat(filepath)
            backups.append({
                "filename": filename,
                "path": filepath,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "created": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
    return sorted(backups, key=lambda x: x["created"], reverse=True)


def cleanup_old_backups(keep_days: int = 30, keep_minimum: int = 5):
    """Remove backups older than keep_days, but always keep at least keep_minimum."""
    backups = list_backups()
    
    if len(backups) <= keep_minimum:
        return
    
    cutoff = datetime.now().timestamp() - (keep_days * 24 * 60 * 60)
    
    for backup in backups[keep_minimum:]:  # Skip the most recent ones
        filepath = backup["path"]
        if os.stat(filepath).st_mtime < cutoff:
            os.remove(filepath)
            print(f"Removed old backup: {backup['filename']}")


def export_to_json() -> dict:
    """Export entire database to JSON for portability."""
    from models import User, Unit, QAReport, QATest, OutputReading, AuditLog
    
    db = SessionLocal()
    try:
        data = {
            "exported_at": datetime.now().isoformat(),
            "units": [],
            "reports": [],
            "output_readings": [],
            "audit_log": []
        }
        
        # Export units
        for unit in db.query(Unit).all():
            data["units"].append({
                "id": unit.id,
                "name": unit.name,
                "manufacturer": unit.manufacturer,
                "model": unit.model,
                "serial_number": unit.serial_number,
                "location": unit.location,
                "install_date": unit.install_date.isoformat() if unit.install_date else None,
                "photon_energies": unit.photon_energies,
                "electron_energies": unit.electron_energies,
                "fff_energies": unit.fff_energies,
                "active": unit.active
            })
        
        # Export QA reports with tests
        for report in db.query(QAReport).all():
            report_data = {
                "id": report.id,
                "date": report.date.isoformat(),
                "qa_type": report.qa_type,
                "unit_id": report.unit_id,
                "performer": report.performer,
                "witness": report.witness,
                "comments": report.comments,
                "signature": report.signature,
                "created_at": report.created_at.isoformat(),
                "tests": []
            }
            for test in report.tests:
                report_data["tests"].append({
                    "test_id": test.test_id,
                    "status": test.status,
                    "notes": test.notes,
                    "measurement": test.measurement
                })
            data["reports"].append(report_data)
        
        # Export output readings
        for reading in db.query(OutputReading).all():
            data["output_readings"].append({
                "id": reading.id,
                "date": reading.date.isoformat(),
                "unit_id": reading.unit_id,
                "energy": reading.energy,
                "reading": reading.reading,
                "reference": reading.reference,
                "deviation": reading.deviation
            })
        
        # Export audit log
        for log in db.query(AuditLog).all():
            data["audit_log"].append({
                "id": log.id,
                "timestamp": log.timestamp.isoformat(),
                "user": log.user,
                "action": log.action,
                "details": log.details,
                "ip_address": log.ip_address
            })
        
        return data
    finally:
        db.close()
