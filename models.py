"""
SQLAlchemy ORM models for Linac QA System.
"""

from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    """User accounts for authentication."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(String(20), default="physicist")  # admin, physicist, therapist
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    
    def __repr__(self):
        return f"<User {self.username}>"


class Unit(Base):
    """Linear accelerator units."""
    __tablename__ = "units"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # e.g., "Linac 1", "TrueBeam"
    manufacturer = Column(String(50))  # Varian, Elekta, Siemens
    model = Column(String(50))  # TrueBeam, Halcyon, Versa HD
    serial_number = Column(String(50))
    location = Column(String(100))  # Vault 1, Building A
    install_date = Column(Date)
    
    # Energy configurations stored as JSON arrays
    photon_energies = Column(JSON, default=list)  # ["6MV", "10MV", "15MV"]
    electron_energies = Column(JSON, default=list)  # ["6MeV", "9MeV", "12MeV"]
    fff_energies = Column(JSON, default=list)  # ["6MV FFF", "10MV FFF"]
    
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    qa_reports = relationship("QAReport", back_populates="unit")
    output_readings = relationship("OutputReading", back_populates="unit")
    
    def __repr__(self):
        return f"<Unit {self.name} S/N:{self.serial_number}>"
    
    @property
    def all_photon_energies(self):
        """Return all photon energies including FFF."""
        return (self.photon_energies or []) + (self.fff_energies or [])


class QAReport(Base):
    """QA report header - one per QA session."""
    __tablename__ = "qa_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    qa_type = Column(String(20), nullable=False)  # daily, monthly, quarterly, annual
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    
    performer = Column(String(100), nullable=False)
    witness = Column(String(100))
    comments = Column(Text)
    signature = Column(String(100))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    unit = relationship("Unit", back_populates="qa_reports")
    tests = relationship("QATest", back_populates="report", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<QAReport {self.qa_type} {self.date} Unit:{self.unit_id}>"
    
    @property
    def pass_count(self):
        return sum(1 for t in self.tests if t.status == "pass")
    
    @property
    def fail_count(self):
        return sum(1 for t in self.tests if t.status == "fail")
    
    @property
    def total_tests(self):
        return len([t for t in self.tests if t.status in ("pass", "fail")])


class QATest(Base):
    """Individual test results within a QA report."""
    __tablename__ = "qa_tests"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("qa_reports.id"), nullable=False)
    
    test_id = Column(String(10), nullable=False)  # DL1, ML5, Q1, AL12, etc.
    status = Column(String(10))  # pass, fail, na, or empty
    notes = Column(Text)
    measurement = Column(Float)  # Optional numeric measurement
    
    # Relationships
    report = relationship("QAReport", back_populates="tests")
    
    def __repr__(self):
        return f"<QATest {self.test_id} {self.status}>"


class OutputReading(Base):
    """Output constancy readings for trend tracking."""
    __tablename__ = "output_readings"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    energy = Column(String(20), nullable=False)  # 6MV, 10MV, 6MeV, etc.
    
    reading = Column(Float, nullable=False)
    reference = Column(Float, nullable=False)
    deviation = Column(Float)  # Calculated: (reading - reference) / reference * 100
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    unit = relationship("Unit", back_populates="output_readings")
    
    def __repr__(self):
        return f"<OutputReading {self.date} {self.energy} {self.deviation}%>"


class AuditLog(Base):
    """Audit trail for compliance."""
    __tablename__ = "audit_log"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user = Column(String(100))
    action = Column(String(50), nullable=False)  # LOGIN, SAVE, EXPORT, DELETE, etc.
    details = Column(Text)
    ip_address = Column(String(45))
    
    def __repr__(self):
        return f"<AuditLog {self.timestamp} {self.action}>"


# SASQART Test Definitions (reference data)
SASQART_TESTS = {
    "daily": [
        {"id": "DL1", "description": "Door interlock", "tolerance": "Functional", "action": "Functional"},
        {"id": "DL2", "description": "Radiation beam status indicators", "tolerance": "Functional", "action": "Functional"},
        {"id": "DL3", "description": "Audio-visual monitor", "tolerance": "Functional", "action": "Functional"},
        {"id": "DL4", "description": "Gantry/collimator motion interlock", "tolerance": "Functional", "action": "Functional"},
        {"id": "DL5", "description": "Couch motion/brakes", "tolerance": "Functional", "action": "Functional"},
        {"id": "DL6", "description": "Radiation area monitors", "tolerance": "Functional", "action": "Functional"},
        {"id": "DL7", "description": "Beam interrupt devices", "tolerance": "Functional", "action": "Functional"},
        {"id": "DL8", "description": "Output constancy – photons", "tolerance": "2.00%", "action": "3.00%"},
        {"id": "DL9", "description": "Output constancy – electrons", "tolerance": "2.00%", "action": "3.00%"},
    ],
    "monthly": [
        {"id": "ML1", "description": "Emergency off switches", "tolerance": "Functional", "action": "Functional"},
        {"id": "ML2", "description": "Lasers and crosswires", "tolerance": "1 mm", "action": "2 mm"},
        {"id": "ML3", "description": "Optical distance indicator", "tolerance": "1 mm", "action": "2 mm"},
        {"id": "ML4", "description": "Radiation/light field size", "tolerance": "1 mm", "action": "2 mm"},
        {"id": "ML5", "description": "Physical/dynamic wedge factors", "tolerance": "1%", "action": "2%"},
        {"id": "ML6", "description": "Gantry angle indicators", "tolerance": "0.5°", "action": "1°"},
        {"id": "ML7", "description": "Collimator angle indicators", "tolerance": "0.5°", "action": "1°"},
        {"id": "ML8", "description": "Couch position indicators", "tolerance": "1 mm", "action": "2 mm"},
        {"id": "ML9", "description": "Couch rotation isocentre", "tolerance": "1 mm", "action": "2 mm"},
        {"id": "ML10", "description": "Couch angle indicator", "tolerance": "0.5°", "action": "1°"},
        {"id": "ML11", "description": "Collimator rotation isocentre", "tolerance": "1 mm", "action": "2 mm"},
        {"id": "ML12", "description": "Light/radiation field coincidence", "tolerance": "1 mm", "action": "2 mm"},
        {"id": "ML13", "description": "Beam flatness constancy", "tolerance": "1%", "action": "2%"},
        {"id": "ML14", "description": "Beam symmetry constancy", "tolerance": "1%", "action": "2%"},
        {"id": "ML15", "description": "Relative dosimetry constancy", "tolerance": "1%", "action": "2%"},
        {"id": "ML16", "description": "Accuracy of QA records", "tolerance": "Complete", "action": "Complete"},
    ],
    "quarterly": [
        {"id": "Q1", "description": "Central axis depth dose reproducibility", "tolerance": "1%/2mm", "action": "2%/3mm"},
    ],
    "annual": [
        {"id": "AL1", "description": "Accessory mechanical integrity", "tolerance": "Safe", "action": "Safe"},
        {"id": "AL2", "description": "Accessory interlocks", "tolerance": "Functional", "action": "Functional"},
        {"id": "AL3", "description": "ODI at extended distances", "tolerance": "1 mm", "action": "2 mm"},
        {"id": "AL4", "description": "Light/rad coincidence vs gantry", "tolerance": "1 mm", "action": "2 mm"},
        {"id": "AL5", "description": "Field size vs gantry angle", "tolerance": "1 mm", "action": "2 mm"},
        {"id": "AL6", "description": "TRS-398 calibration", "tolerance": "1%", "action": "2%"},
        {"id": "AL7", "description": "Output factors", "tolerance": "1%", "action": "2%"},
        {"id": "AL8", "description": "Wedge transmission and profiles", "tolerance": "1%", "action": "2%"},
        {"id": "AL9", "description": "Accessory transmission factors", "tolerance": "1%", "action": "2%"},
        {"id": "AL10", "description": "Output vs gantry angle", "tolerance": "1%", "action": "2%"},
        {"id": "AL11", "description": "Symmetry vs gantry angle", "tolerance": "1%", "action": "2%"},
        {"id": "AL12", "description": "Monitor unit linearity", "tolerance": "1%", "action": "2%"},
        {"id": "AL13", "description": "Monitor unit end effect", "tolerance": "< 1 MU", "action": "< 2 MU"},
        {"id": "AL14", "description": "Collimator rotation isocentre", "tolerance": "1 mm", "action": "2 mm"},
        {"id": "AL15", "description": "Gantry rotation isocentre", "tolerance": "1 mm", "action": "2 mm"},
        {"id": "AL16", "description": "Couch rotation isocentre", "tolerance": "1 mm", "action": "2 mm"},
        {"id": "AL17", "description": "Coincidence of axes", "tolerance": "1 mm", "action": "2 mm"},
        {"id": "AL18", "description": "Independent review", "tolerance": "Complete", "action": "Complete"},
    ]
}
