from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import engine
from .routers import livros

# Cria as tabelas no banco se ainda não existirem
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API Biblioteca",
    version="1.0.0",
    docs_url="/api/docs",       # Swagger UI em /api/docs
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS: permite que o frontend (porta 5173) chame o backend (porta 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra o router de livros
app.include_router(livros.router, prefix="/api")


@app.get("/api/health", tags=["Sistema"])
def health():
    """Rota simples para saber se a API está viva."""
    return {"status": "ok"}
