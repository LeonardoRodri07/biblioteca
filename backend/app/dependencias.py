# "Dependências": funções que o FastAPI roda ANTES da rota.
# Se lançarem erro, a rota nem chega a executar.
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import models, seguranca
from .database import get_db

# Diz ao FastAPI onde fica o login. Isso também cria o botão "Authorize"
# (cadeado) no Swagger.
esquema_oauth = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def usuario_atual(
    token: str = Depends(esquema_oauth),
    db: Session = Depends(get_db),
) -> models.Usuario:
    """Exige login: devolve o usuário dono do token ou responde 401."""
    erro = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado ou sessão expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )
    usuario_id = seguranca.ler_token(token)
    if usuario_id is None:
        raise erro
    usuario = db.get(models.Usuario, usuario_id)
    # Se a conta foi desativada depois do login, o token deixa de valer.
    if usuario is None or not usuario.ativo:
        raise erro
    return usuario


def exigir_admin(usuario: models.Usuario = Depends(usuario_atual)) -> models.Usuario:
    """Exige login E papel admin: senão responde 403."""
    if usuario.papel != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem fazer isso",
        )
    return usuario