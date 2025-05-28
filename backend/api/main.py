from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import sys
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Ajouter le dossier scripts au path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'scripts'))

# Import des routes
from .routes import catalog, orders, auth, products, foxway

# Lifespan pour gérer le démarrage/arrêt
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Démarrage
    print("🚀 Starting DBC B2B API...")
    # Initialiser les connexions (DB, Redis, etc.)
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

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend Next.js
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes principales
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(catalog.router, prefix="/api/catalog", tags=["Catalog"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(foxway.router, prefix="/api/foxway", tags=["Foxway Integration"])

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
            "database": "operational",  # TODO: Vérifier vraiment
            "foxway_integration": "planned"  # Future
        }
    } 