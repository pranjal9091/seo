from fastapi.testclient import TestClient
from app.main import app
from app.storage.db import init_db

init_db()

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "module_2_technical_aeo_auditor" in data["modules"]
    assert "ACTIVE" in data["modules"]["module_2_technical_aeo_auditor"]
    assert "IN PROGRESS" in data["modules"]["module_1_ai_visibility_tracker"]

def test_roadmap_endpoint():
    response = client.get("/api/roadmap")
    assert response.status_code == 200
    data = response.json()
    assert len(data["modules"]) == 5
    m1 = next(m for m in data["modules"] if m["id"] == "module_1")
    assert m1["status"] == "IN PROGRESS"
    m2 = next(m for m in data["modules"] if m["id"] == "module_2")
    assert "COMPLETE" in m2["status"]

def test_history_endpoint():
    response = client.get("/api/history")
    assert response.status_code == 200
    data = response.json()
    assert "history" in data
