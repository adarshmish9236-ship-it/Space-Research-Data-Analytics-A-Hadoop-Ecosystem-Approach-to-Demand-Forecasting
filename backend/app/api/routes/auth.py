"""ORBITALYTICS — Authentication Routes & Security Dependencies
JWT-based auth with role-based access control (ADMIN, ANALYST, VIEWER).
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, List
import jwt
from fastapi import APIRouter, HTTPException, status, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

router = APIRouter()
log = logging.getLogger(__name__)

# ── Demo secret & config ──────────────────────────────────────────────────────
SECRET_KEY = "orbitalytics-jwt-secret-2026-dev"  # Change in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

security_bearer = HTTPBearer(auto_error=False)

# ── Role Permissions Mapping ──────────────────────────────────────────────────
ROLE_PERMISSIONS = {
    "ADMIN": ["*"],
    "ANALYST": [
        "dashboard:read", "missions:read", "analytics:read",
        "patterns:read", "forecast:read", "scenarios:run",
        "odi:read", "models:read", "models:retrain", "data:read", "data:export", "reports:read", "reports:export"
    ],
    "VIEWER": [
        "dashboard:read", "patterns:read", "reports:read"
    ],
}

# ── Demo user store ───────────────────────────────────────────────────────────
DEMO_USERS = {
    "admin@orbitalytics.io": {
        "user_id": "usr_admin_001",
        "name": "Mission Commander",
        "password": "admin2026",
        "role": "ADMIN",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
    },
    "analyst@orbitalytics.io": {
        "user_id": "usr_analyst_001",
        "name": "Data Analyst",
        "password": "analyst2026",
        "role": "ANALYST",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
    },
    "viewer@orbitalytics.io": {
        "user_id": "usr_viewer_001",
        "name": "Mission Observer",
        "password": "viewer2026",
        "role": "VIEWER",
        "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
    },
}


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    name: str
    email: str
    role: str
    expires_in: int


class UserProfileResponse(BaseModel):
    user_id: str
    name: str
    email: str
    role: str
    permissions: List[str]


def _create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    authorization: Optional[str] = Header(None),
) -> dict:
    """Dependency that extracts and verifies JWT bearer token."""
    raw_token = None
    if credentials and credentials.credentials:
        raw_token = credentials.credentials
    elif authorization and authorization.lower().startswith("bearer "):
        raw_token = authorization.split(" ", 1)[1].strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(raw_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        role: str = payload.get("role")
        name: str = payload.get("name")
        if not user_id or not role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {
            "user_id": user_id,
            "email": email,
            "role": role,
            "name": name,
            "permissions": ROLE_PERMISSIONS.get(role, []),
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please re-authenticate.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_roles(*allowed_roles: str):
    """Dependency factory checking if current user has any of the allowed roles."""
    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        if "*" in allowed_roles:
            return current_user
        if current_user["role"] == "ADMIN":
            return current_user
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role: {', '.join(allowed_roles)}. Your role: {current_user['role']}",
            )
        return current_user
    return role_checker


@router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Authenticate user and return JWT access token."""
    user = DEMO_USERS.get(request.email.lower().strip())
    if not user or user["password"] != request.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token_data = {
        "sub": user["user_id"],
        "email": request.email.lower().strip(),
        "role": user["role"],
        "name": user["name"],
    }
    access_token = _create_access_token(token_data)

    log.info(f"Authenticated user {request.email} with role {user['role']}")

    return LoginResponse(
        access_token=access_token,
        user_id=user["user_id"],
        name=user["name"],
        email=request.email.lower().strip(),
        role=user["role"],
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/auth/me", response_model=UserProfileResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Returns profile and permission details for the currently authenticated user."""
    return UserProfileResponse(
        user_id=current_user["user_id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
        permissions=current_user.get("permissions", []),
    )


@router.get("/auth/demo-accounts")
async def list_demo_accounts():
    """List available demo accounts for testing without exposing raw passwords."""
    return [
        {
            "role": "ADMIN",
            "email": "admin@orbitalytics.io",
            "name": "Mission Commander",
            "description": "Full access to all modules, Hadoop cluster management, ML retraining, and audit logs.",
            "color": "#EF4444",
        },
        {
            "role": "ANALYST",
            "email": "analyst@orbitalytics.io",
            "name": "Data Analyst",
            "description": "Access to analytics, ML forecasts, scenario simulator, and data lake queries.",
            "color": "#00C8E8",
        },
        {
            "role": "VIEWER",
            "email": "viewer@orbitalytics.io",
            "name": "Mission Observer",
            "description": "Read-only access to overview dashboard and executive briefings.",
            "color": "#10B981",
        },
    ]
