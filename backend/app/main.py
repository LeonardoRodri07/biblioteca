from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles  # NOVO: serve arquivos (imagens)

from . import models  # noqa: F401
from .database import Base, engine
from .routers import livros
from .storage import UPLOAD_DIR

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API Biblioteca de Livros",
    description="API para gerenciar uma biblioteca de livros (projeto de aprendizado).",
    version="0.4.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(livros.router)

# NOVO: tudo que estiver em backend/uploads fica acessível em /api/capas/...
app.mount("/api/capas", StaticFiles(directory=UPLOAD_DIR), name="capas")


# decorator para criar um endpoint(endereço da API que responde a req GET) GET na rota "/api/saude" com a tag "Sistema"   
@app.get("/api/saude", tags=["Sistema"])
def verificar_saude():
    """Verifica se a API está funcionando (health check)."""
    return {"status": "ok", "mensagem": "API da biblioteca está no ar!"}