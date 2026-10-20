# Rotas de autenticação: login e "quem sou eu".
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas, seguranca
from ..database import get_db
from ..dependencias import usuario_atual

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


# O login recebe um FORMULÁRIO (campos "username" e "password"), não JSON.
# É o padrão OAuth2, e é o que faz o botão "Authorize" do Swagger funcionar.
@router.post("/login", response_model=schemas.Token)
def login(
    formulario: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Confere usuário e senha e devolve um token de acesso."""
    usuario = db.scalar(
        select(models.Usuario).where(models.Usuario.username == formulario.username)
    )
    # Sempre conferimos um hash (o falso, se o usuário não existe): tempo igual.
    hash_conferido = usuario.senha_hash if usuario else seguranca.HASH_FALSO
    senha_ok = seguranca.verificar_senha(formulario.password, hash_conferido)

    # Mesma mensagem para "usuário não existe", "senha errada" e "conta
    # desativada": não revelamos qual deles falhou.
    if usuario is None or not senha_ok or not usuario.ativo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return schemas.Token(
        access_token=seguranca.criar_token(usuario.id),
        usuario=usuario,
    )


@router.get("/eu", response_model=schemas.UsuarioResposta)
def quem_sou_eu(usuario: models.Usuario = Depends(usuario_atual)):
    """Devolve os dados de quem está logado (o frontend usa ao recarregar a página)."""
    return usuario