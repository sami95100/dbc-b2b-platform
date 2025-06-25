from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Lifespan pour gérer le démarrage/arrêt
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Démarrage
    print("🚀 Starting DBC B2B API...")
    yield
    # Arrêt
    print("👋 Shutting down DBC B2B API...")

# Créer l'application FastAPI
app = FastAPI(
    title="DBC B2B Platform API",
    description="API pour la plateforme B2B DBC avec intégration Foxway",
    version="1.0.0",
    lifespan=lifespan
)

# Configuration CORS pour production et développement
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "DBC B2B Platform API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "api": "operational",
            "database": "operational",
            "foxway_integration": "planned"
        }
    }

@app.get("/api/test")
async def test_endpoint():
    return {"message": "Backend is working!"} 