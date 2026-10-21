from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from . import config, models, seguranca
from .database import Base, SessionLocal, engine
from .routers import auth, livros, usuarios
from .storage import UPLOAD_DIR

# Cria as tabelas que ainda não existem (inclui "usuarios").
Base.metadata.create_all(bind=engine)


def criar_admin_inicial() -> None:
    """Cria o primeiro administrador, se ainda não existir nenhum."""
    with SessionLocal() as db:
        ja_tem_admin = db.scalar(
            select(models.Usuario).where(models.Usuario.papel == "admin")
        )
        if ja_tem_admin:
            return
        if not (config.ADMIN_USERNAME and config.ADMIN_PASSWORD):
            print("AVISO: nenhum admin existe e ADMIN_USERNAME/ADMIN_PASSWORD "
                  "não estão no .env. Ninguém conseguirá administrar o sistema.")
            return
        db.add(models.Usuario(
            username=config.ADMIN_USERNAME,
            senha_hash=seguranca.gerar_hash(config.ADMIN_PASSWORD),
            papel="admin",
        ))
        db.commit()
        print(f"Admin inicial criado: {config.ADMIN_USERNAME}")


criar_admin_inicial()

app = FastAPI(
    title="API Biblioteca de Livros",
    description="API para gerenciar uma biblioteca de livros (projeto de aprendizado).",
    version="0.5.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],  # inclui o cabeçalho Authorization
)

app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(livros.router)

# As capas continuam públicas (a tag <img> não envia o token).
app.mount("/api/capas", StaticFiles(directory=UPLOAD_DIR), name="capas")


@app.get("/api/saude", tags=["Sistema"])
def verificar_saude():
    """Verifica se a API está funcionando (health check). Público."""
    return {"status": "ok", "mensagem": "API da biblioteca está no ar!"}