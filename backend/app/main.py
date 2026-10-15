from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401
from .database import Base, engine
from .routers import livros

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API Biblioteca de Livros",
    description="API para gerenciar uma biblioteca de livros (projeto de aprendizado).",
    version="0.3.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS: diz ao navegador quais "origens" (sites) podem chamar esta API.
# 5173 é a porta padrão do Vite. Em produção, trocaremos pelo domínio real.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],   # GET, POST, PATCH, DELETE...
    allow_headers=["*"],   # Content-Type etc.
)

app.include_router(livros.router)


# decorator para criar um endpoint(endereço da API que responde a req GET) GET na rota "/api/saude" com a tag "Sistema"   
@app.get("/api/saude", tags=["Sistema"])
def verificar_saude():
    """Verifica se a API está funcionando (health check)."""
    return {"status": "ok", "mensagem": "API da biblioteca está no ar!"}
