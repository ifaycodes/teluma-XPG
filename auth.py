from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
import os

security = HTTPBearer()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_ANON_KEY"),
)


def _get_supabase_user(token: str):
    try:
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user
    except HTTPException:
        raise
    except Exception as e:
        print("AUTH ERROR: ", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return str(_get_supabase_user(credentials.credentials).id)

def get_current_supabase_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return _get_supabase_user(credentials.credentials)