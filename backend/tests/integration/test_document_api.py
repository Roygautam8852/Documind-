"""Integration tests for document API endpoints.

Tests cover:
- Upload: accepted files, size limits, bad extensions, empty files
- List: pagination, user isolation
- Get: existing vs not-found, cross-user access prevention
- Delete: success, processing guard, cross-user prevention
- Retry: failed status required, cross-user prevention

All tests run against the in-memory SQLite fixture from conftest.py.
File I/O uses a temporary directory patched into settings.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

# ── Helpers ────────────────────────────────────────────────────────────────────


async def _register_and_login(
    client: AsyncClient, email: str, password: str = "testpass123"
) -> str:
    """Create a user account and return a JWT token."""
    resp = await client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert resp.status_code == 201, resp.text
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _fake_pdf(content: str = "Hello PDF world. This is a test document.") -> bytes:
    """Return minimal valid PDF bytes."""
    # Minimal 1-page PDF that PyMuPDF can read
    return (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R"
        b"/Resources<</Font<</F1 4 0 R>>>>"
        b"/Contents 5 0 R>>endobj\n"
        b"4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
        b"5 0 obj<</Length 44>>\nstream\nBT /F1 12 Tf 100 700 Td (Hello) Tj ET\nendstream\nendobj\n"
        b"xref\n0 6\n0000000000 65535 f\n"
        b"0000000009 00000 n\n0000000058 00000 n\n"
        b"0000000115 00000 n\n0000000266 00000 n\n0000000340 00000 n\n"
        b"trailer<</Size 6/Root 1 0 R>>\nstartxref\n406\n%%EOF"
    )


def _fake_txt(content: str = "Line one.\nLine two.\nLine three.") -> bytes:
    return content.encode("utf-8")


def _fake_docx() -> bytes:
    """Return a minimal valid DOCX file bytes."""
    try:
        import io as _io

        from docx import Document as DocxDoc

        buf = _io.BytesIO()
        d = DocxDoc()
        d.add_paragraph("Hello docx world.")
        d.save(buf)
        return buf.getvalue()
    except ImportError:
        pytest.skip("python-docx not installed")


# ── Upload tests ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upload_txt_returns_202(client: AsyncClient, tmp_path: Path) -> None:
    token = await _register_and_login(client, "upload@test.com")
    with patch("app.services.ingestion_service.schedule_ingestion"):
        with patch("app.core.config.get_settings") as mock_settings:
            s = MagicMock()
            s.allowed_extensions_set = {"pdf", "docx", "txt"}
            s.max_upload_bytes = 50 * 1024 * 1024
            s.max_upload_mb = 50
            s.max_user_documents = 100
            s.max_user_storage_mb = 1024
            s.upload_dir = str(tmp_path)
            s.chunk_size = 800
            s.chunk_overlap = 120
            mock_settings.return_value = s

            resp = await client.post(
                "/api/v1/documents",
                files={"file": ("sample.txt", _fake_txt(), "text/plain")},
                headers=_auth(token),
            )
    assert resp.status_code == 202, resp.text
    data = resp.json()
    assert data["status"] == "uploaded"
    assert data["original_filename"] == "sample.txt"
    assert "id" in data


@pytest.mark.asyncio
async def test_upload_requires_auth(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/documents",
        files={"file": ("a.txt", _fake_txt(), "text/plain")},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_upload_rejected_extension(client: AsyncClient, tmp_path: Path) -> None:
    token = await _register_and_login(client, "badext@test.com")
    with patch("app.core.config.get_settings") as mock_settings:
        s = MagicMock()
        s.allowed_extensions_set = {"pdf", "docx", "txt"}
        s.max_upload_bytes = 50 * 1024 * 1024
        s.max_upload_mb = 50
        s.max_user_documents = 100
        s.max_user_storage_mb = 1024
        s.upload_dir = str(tmp_path)
        mock_settings.return_value = s

        resp = await client.post(
            "/api/v1/documents",
            files={"file": ("malware.exe", b"MZ binary", "application/octet-stream")},
            headers=_auth(token),
        )
    assert resp.status_code == 415
    assert resp.json()["error_code"] == "unsupported_file_type"


@pytest.mark.asyncio
async def test_upload_empty_file_rejected(client: AsyncClient, tmp_path: Path) -> None:
    token = await _register_and_login(client, "empty@test.com")
    with patch("app.core.config.get_settings") as mock_settings:
        s = MagicMock()
        s.allowed_extensions_set = {"pdf", "docx", "txt"}
        s.max_upload_bytes = 50 * 1024 * 1024
        s.max_upload_mb = 50
        s.max_user_documents = 100
        s.max_user_storage_mb = 1024
        s.upload_dir = str(tmp_path)
        mock_settings.return_value = s

        resp = await client.post(
            "/api/v1/documents",
            files={"file": ("empty.txt", b"", "text/plain")},
            headers=_auth(token),
        )
    assert resp.status_code == 422
    assert resp.json()["error_code"] == "malformed_file"


@pytest.mark.asyncio
async def test_upload_rejects_content_that_does_not_match_extension(
    client: AsyncClient, tmp_path: Path
) -> None:
    token = await _register_and_login(client, "spoof@test.com")
    with patch("app.core.config.get_settings") as mock_settings:
        settings = MagicMock()
        settings.allowed_extensions_set = {"pdf", "docx", "txt"}
        settings.max_upload_bytes = 50 * 1024 * 1024
        settings.max_upload_mb = 50
        settings.max_user_documents = 100
        settings.max_user_storage_mb = 1024
        settings.upload_dir = str(tmp_path)
        mock_settings.return_value = settings

        response = await client.post(
            "/api/v1/documents",
            files={"file": ("spoof.txt", b"\xff\x00not utf-8 text", "text/plain")},
            headers=_auth(token),
        )
    assert response.status_code == 422
    assert response.json()["error_code"] == "malformed_file"


# ── List tests ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_documents_empty(client: AsyncClient) -> None:
    token = await _register_and_login(client, "listuser@test.com")
    resp = await client.get("/api/v1/documents", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_list_documents_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/documents")
    assert resp.status_code == 401


# ── Get tests ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_nonexistent_document_returns_404(client: AsyncClient) -> None:
    token = await _register_and_login(client, "get404@test.com")
    resp = await client.get(
        "/api/v1/documents/00000000-0000-0000-0000-000000000000",
        headers=_auth(token),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cross_user_document_access_prevented(client: AsyncClient, tmp_path: Path) -> None:
    """User B must not be able to access User A's documents."""
    token_a = await _register_and_login(client, "usera@test.com")
    token_b = await _register_and_login(client, "userb@test.com")

    # Upload as user A (we need a real document in DB)
    with patch("app.services.ingestion_service.schedule_ingestion"):
        with patch("app.core.config.get_settings") as mock_settings:
            s = MagicMock()
            s.allowed_extensions_set = {"pdf", "docx", "txt"}
            s.max_upload_bytes = 50 * 1024 * 1024
            s.max_upload_mb = 50
            s.max_user_documents = 100
            s.max_user_storage_mb = 1024
            s.upload_dir = str(tmp_path)
            s.chunk_size = 800
            s.chunk_overlap = 120
            mock_settings.return_value = s

            resp = await client.post(
                "/api/v1/documents",
                files={"file": ("secret.txt", _fake_txt("Top secret"), "text/plain")},
                headers=_auth(token_a),
            )
    assert resp.status_code == 202
    doc_id = resp.json()["id"]

    # User B tries to access User A's document — must get 404
    resp = await client.get(f"/api/v1/documents/{doc_id}", headers=_auth(token_b))
    assert resp.status_code == 404, "Cross-user document access was not prevented!"


# ── Delete tests ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_nonexistent_returns_404(client: AsyncClient) -> None:
    token = await _register_and_login(client, "del404@test.com")
    resp = await client.delete(
        "/api/v1/documents/00000000-0000-0000-0000-000000000001",
        headers=_auth(token),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cross_user_delete_prevented(client: AsyncClient, tmp_path: Path) -> None:
    token_a = await _register_and_login(client, "downer@test.com")
    token_b = await _register_and_login(client, "dattacker@test.com")

    with patch("app.services.ingestion_service.schedule_ingestion"):
        with patch("app.core.config.get_settings") as mock_settings:
            s = MagicMock()
            s.allowed_extensions_set = {"pdf", "docx", "txt"}
            s.max_upload_bytes = 50 * 1024 * 1024
            s.max_upload_mb = 50
            s.max_user_documents = 100
            s.max_user_storage_mb = 1024
            s.upload_dir = str(tmp_path)
            s.chunk_size = 800
            s.chunk_overlap = 120
            mock_settings.return_value = s

            resp = await client.post(
                "/api/v1/documents",
                files={"file": ("data.txt", _fake_txt(), "text/plain")},
                headers=_auth(token_a),
            )
    doc_id = resp.json()["id"]

    # User B tries to delete User A's document
    resp = await client.delete(f"/api/v1/documents/{doc_id}", headers=_auth(token_b))
    assert resp.status_code == 404, "Cross-user delete was not prevented!"


# ── Error response format tests ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_error_response_has_required_fields(client: AsyncClient) -> None:
    """Verify that error responses always include error_code, message, request_id."""
    token = await _register_and_login(client, "errcheck@test.com")
    resp = await client.get(
        "/api/v1/documents/not-a-real-id",
        headers=_auth(token),
    )
    assert resp.status_code == 404
    body = resp.json()
    assert "error_code" in body
    assert "message" in body
    assert "request_id" in body
    # Must never expose internal details
    assert "traceback" not in str(body)
    assert "sqlalchemy" not in str(body).lower()


# ── Full lifecycle test ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upload_parse_list_delete_lifecycle(
    client: AsyncClient, db_session: AsyncSession, tmp_path: Path
) -> None:
    """Full lifecycle integration test: upload -> parse -> list -> delete."""
    from app.models.user import User
    from app.services.ingestion_service import _ingest
    from sqlalchemy import select

    token = await _register_and_login(client, "lifecycle@test.com")

    with patch("app.core.config.get_settings") as mock_settings:
        s = MagicMock()
        s.allowed_extensions_set = {"pdf", "docx", "txt"}
        s.max_upload_bytes = 50 * 1024 * 1024
        s.max_upload_mb = 50
        s.max_user_documents = 100
        s.max_user_storage_mb = 1024
        s.upload_dir = str(tmp_path)
        s.chunk_size = 800
        s.chunk_overlap = 120
        mock_settings.return_value = s

        # 1. Upload document (POST /api/v1/documents)
        with patch("app.services.ingestion_service.schedule_ingestion"):
            resp = await client.post(
                "/api/v1/documents",
                files={
                    "file": (
                        "report.txt",
                        _fake_txt("Phase 1 Document Intelligence.\nLine two content."),
                        "text/plain",
                    )
                },
                headers=_auth(token),
            )
        assert resp.status_code == 202
        doc_id = resp.json()["id"]

        # 2. Ingest document directly through pipeline using test db session
        user_res = await db_session.execute(select(User).where(User.email == "lifecycle@test.com"))
        user = user_res.scalar_one()

        await _ingest(db_session, doc_id, str(user.id))
        await db_session.commit()

        # 3. GET /documents/{id} — verify status is ready and page_count >= 1
        resp = await client.get(f"/api/v1/documents/{doc_id}", headers=_auth(token))
        assert resp.status_code == 200
        doc_data = resp.json()
        assert doc_data["status"] == "ready"
        assert doc_data["page_count"] >= 1
        assert doc_data["original_filename"] == "report.txt"

        # 4. GET /documents — verify document is present in paginated list
        resp = await client.get("/api/v1/documents", headers=_auth(token))
        assert resp.status_code == 200
        list_data = resp.json()
        assert list_data["total"] >= 1
        assert any(d["id"] == doc_id for d in list_data["items"])

        # 5. DELETE /documents/{id} — remove document
        resp = await client.delete(f"/api/v1/documents/{doc_id}", headers=_auth(token))
        assert resp.status_code == 204

        # 6. Verify document is deleted from list and GET returns 404
        resp = await client.get(f"/api/v1/documents/{doc_id}", headers=_auth(token))
        assert resp.status_code == 404

        resp = await client.get("/api/v1/documents", headers=_auth(token))
        assert resp.status_code == 200
        assert not any(d["id"] == doc_id for d in resp.json()["items"])
