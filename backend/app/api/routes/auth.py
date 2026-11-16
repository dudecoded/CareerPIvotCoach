from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
import secrets
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
router = APIRouter(prefix="/api/auth", tags=["authentication"])
bearer = HTTPBearer(auto_error=False)
class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
class GoogleLoginRequest(BaseModel):
    credential: str = Field(min_length=20)
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    profile: dict
class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if credentials is None: raise HTTPException(status_code=401, detail="Sign in to access your personal workspace.")
    try: user_id = decode_access_token(credentials.credentials)
    except ValueError as exc: raise HTTPException(status_code=401, detail=str(exc)) from exc
    user = db.query(User).filter(User.id == user_id).first()
    if user is None: raise HTTPException(status_code=401, detail="Account no longer exists.")
    return user
@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = str(payload.email).lower()
    if db.query(User).filter(User.email == email).first(): raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password), profile={})
    db.add(user); db.commit(); db.refresh(user)
    return AuthResponse(access_token=create_access_token(user.id), user=UserResponse(id=user.id,name=user.name,email=user.email,profile=user.profile or {}))
@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(payload.email).lower()).first()
    if user is None or not verify_password(payload.password,user.password_hash): raise HTTPException(status_code=401,detail="Email or password is incorrect.")
    return AuthResponse(access_token=create_access_token(user.id),user=UserResponse(id=user.id,name=user.name,email=user.email,profile=user.profile or {}))
@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(current_user)):
    return UserResponse(id=user.id,name=user.name,email=user.email,profile=user.profile or {})


@router.post("/google", response_model=AuthResponse)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not client_id:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured on the server yet.")
    try:
        claims = id_token.verify_oauth2_token(payload.credential, google_requests.Request(), client_id)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Google could not verify this sign-in. Please try again.") from exc
    email = str(claims.get("email", "")).lower()
    if not email or not claims.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google did not provide a verified email address.")
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        display_name = str(claims.get("name") or claims.get("given_name") or email.split("@")[0])[:120]
        user = User(name=display_name, email=email, password_hash=hash_password(secrets.token_urlsafe(48)), profile={})
        db.add(user)
        db.commit()
        db.refresh(user)
    return AuthResponse(access_token=create_access_token(user.id), user=UserResponse(id=user.id, name=user.name, email=user.email, profile=user.profile or {}))
