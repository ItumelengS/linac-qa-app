"""
Authentication utilities for Linac QA System.
Simple session-based authentication suitable for internal hospital use.
"""

from datetime import datetime, timedelta
from passlib.context import CryptContext
from itsdangerous import URLSafeTimedSerializer
from fastapi import Request, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Session configuration
SECRET_KEY = "change-this-to-a-secure-random-string-in-production"  # TODO: Move to environment variable
SESSION_COOKIE_NAME = "linac_qa_session"
SESSION_EXPIRE_HOURS = 12

serializer = URLSafeTimedSerializer(SECRET_KEY)


def hash_password(password: str) -> str:
    """Hash a password for storage."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_session_token(user_id: int, username: str) -> str:
    """Create a signed session token."""
    data = {
        "user_id": user_id,
        "username": username,
        "created": datetime.utcnow().isoformat()
    }
    return serializer.dumps(data)


def verify_session_token(token: str, max_age_hours: int = SESSION_EXPIRE_HOURS) -> dict | None:
    """Verify and decode a session token."""
    try:
        data = serializer.loads(token, max_age=max_age_hours * 3600)
        return data
    except Exception:
        return None


def get_current_user(request: Request, db: Session):
    """Get the current logged-in user from session cookie."""
    from models import User
    
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return None
    
    session_data = verify_session_token(token)
    if not session_data:
        return None
    
    user = db.query(User).filter(User.id == session_data["user_id"]).first()
    if not user or not user.active:
        return None
    
    return user


def require_auth(request: Request, db: Session):
    """Dependency that requires authentication."""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_303_SEE_OTHER,
            headers={"Location": "/login"}
        )
    return user


def require_admin(request: Request, db: Session):
    """Dependency that requires admin role."""
    user = require_auth(request, db)
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user


def create_default_admin(db: Session):
    """Create default admin user if no users exist."""
    from models import User
    
    if db.query(User).count() == 0:
        admin = User(
            username="admin",
            email="admin@hospital.local",
            hashed_password=hash_password("changeme123"),
            full_name="System Administrator",
            role="admin",
            active=True
        )
        db.add(admin)
        db.commit()
        print("Default admin user created (username: admin, password: changeme123)")
        print(">>> CHANGE THIS PASSWORD IMMEDIATELY! <<<")
        return admin
    return None


def log_audit(db: Session, user: str, action: str, details: str, ip_address: str = None):
    """Log an audit entry."""
    from models import AuditLog
    
    entry = AuditLog(
        user=user,
        action=action,
        details=details,
        ip_address=ip_address
    )
    db.add(entry)
    db.commit()
