"""Tests for security utilities."""

import pytest
from datetime import timedelta
from app.core.security import (
    hash_password, verify_password,
    create_access_token, decode_token,
    create_refresh_token,
)


def test_password_hash_and_verify():
    plain = "MySecurePass123"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed)
    assert not verify_password("wrongpassword", hashed)


def test_access_token_round_trip():
    token = create_access_token("user-123")
    payload = decode_token(token)
    assert payload["sub"] == "user-123"
    assert payload["type"] == "access"


def test_refresh_token_round_trip():
    token = create_refresh_token("user-456")
    payload = decode_token(token)
    assert payload["sub"] == "user-456"
    assert payload["type"] == "refresh"


def test_expired_token_raises():
    from fastapi import HTTPException
    token = create_access_token("user-789", expires_delta=timedelta(seconds=-1))
    with pytest.raises(HTTPException) as exc:
        decode_token(token)
    assert exc.value.status_code == 401


def test_invalid_token_raises():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        decode_token("not.a.valid.jwt.token")
    assert exc.value.status_code == 401
