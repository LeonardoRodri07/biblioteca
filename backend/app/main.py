from fastapi import FastAPI

from . import models  # noqa: F401  (importar garante que o model seja registrado)
from .database import Base, engine
from .routers import livros

# Cria as tabelas no banco se ainda não existirem.
# (Em projetos maiores isso é feito com migrações, como o Alembic.
#  Para aprender, create_all é suficiente.)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API Biblioteca de Livros",
    description="API para gerenciar uma biblioteca de livros (projeto de aprendizado).",
    version="0.2.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Conecta o router de livros à aplicação.
app.include_router(livros.router)


@app.get("/api/saude", tags=["Sistema"])
def verificar_saude():
    """Verifica se a API está funcionando (health check)."""
    return {"status": "ok", "mensagem": "API da biblioteca está no ar!"}
