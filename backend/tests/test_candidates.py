"""Tests for candidate management endpoints."""

import pytest
from httpx import AsyncClient


async def _get_auth_header(client: AsyncClient, email: str = "cand@test.com") -> dict:
    reg = await client.post("/api/v1/auth/register", json={
        "email": email, "full_name": "Test", "password": "password123", "role": "recruiter"
    })
    token = reg.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_candidate(client: AsyncClient):
    headers = await _get_auth_header(client, "c1@test.com")
    response = await client.post("/api/v1/candidates", json={
        "full_name": "Jane Smith",
        "email": "jane@example.com",
        "current_title": "Senior Engineer",
        "current_company": "Acme",
        "location": "Singapore",
        "years_experience": 7,
        "skills": ["Python", "FastAPI", "Docker"],
    }, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["full_name"] == "Jane Smith"
    assert data["email"] == "jane@example.com"
    assert "Python" in data["skills"]


@pytest.mark.asyncio
async def test_list_candidates(client: AsyncClient):
    headers = await _get_auth_header(client, "c2@test.com")
    await client.post("/api/v1/candidates", json={
        "full_name": "Bob Jones", "email": "bob@test.com"
    }, headers=headers)
    response = await client.get("/api/v1/candidates", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_candidate_by_id(client: AsyncClient):
    headers = await _get_auth_header(client, "c3@test.com")
    create = await client.post("/api/v1/candidates", json={
        "full_name": "Alice Brown", "email": "alice@test.com"
    }, headers=headers)
    cid = create.json()["id"]
    response = await client.get(f"/api/v1/candidates/{cid}", headers=headers)
    assert response.status_code == 200
    assert response.json()["full_name"] == "Alice Brown"


@pytest.mark.asyncio
async def test_update_candidate(client: AsyncClient):
    headers = await _get_auth_header(client, "c4@test.com")
    create = await client.post("/api/v1/candidates", json={
        "full_name": "Charlie Green", "email": "charlie@test.com"
    }, headers=headers)
    cid = create.json()["id"]
    response = await client.patch(f"/api/v1/candidates/{cid}", json={
        "current_title": "Staff Engineer",
        "status": "interview",
    }, headers=headers)
    assert response.status_code == 200
    assert response.json()["current_title"] == "Staff Engineer"
    assert response.json()["status"] == "interview"


@pytest.mark.asyncio
async def test_delete_candidate(client: AsyncClient):
    headers = await _get_auth_header(client, "c5@test.com")
    create = await client.post("/api/v1/candidates", json={
        "full_name": "To Delete", "email": "delete@test.com"
    }, headers=headers)
    cid = create.json()["id"]
    response = await client.delete(f"/api/v1/candidates/{cid}", headers=headers)
    assert response.status_code == 204

    get = await client.get(f"/api/v1/candidates/{cid}", headers=headers)
    assert get.status_code == 404


@pytest.mark.asyncio
async def test_candidate_not_found(client: AsyncClient):
    headers = await _get_auth_header(client, "c6@test.com")
    response = await client.get(
        "/api/v1/candidates/00000000-0000-0000-0000-000000000000",
        headers=headers
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_viewer_cannot_create(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={
        "email": "viewer@test.com", "full_name": "Viewer", "password": "password123", "role": "viewer"
    })
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    response = await client.post("/api/v1/candidates", json={"full_name": "Blocked"}, headers=headers)
    assert response.status_code == 403
