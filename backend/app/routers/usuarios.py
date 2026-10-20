# Gerenciamento de usuários: só administradores.
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas, seguranca
from ..database import get_db
from ..dependencias import exigir_admin

# "dependencies" no router: TODAS as rotas daqui exigem admin.
router = APIRouter(
    prefix="/api/usuarios",
    tags=["Usuários"],
    dependencies=[Depends(exigir_admin)],
)


@router.get("", response_model=list[schemas.UsuarioResposta])
def listar_usuarios(db: Session = Depends(get_db)):
    """Lista todos os usuários."""
    return db.scalars(select(models.Usuario).order_by(models.Usuario.id)).all()


@router.post("", response_model=schemas.UsuarioResposta, status_code=status.HTTP_201_CREATED)
def criar_usuario(dados: schemas.UsuarioCriar, db: Session = Depends(get_db)):
    """Cria um usuário (admin ou comum)."""
    existente = db.scalar(
        select(models.Usuario).where(models.Usuario.username == dados.username)
    )
    if existente:
        raise HTTPException(status_code=409, detail="Esse nome de usuário já existe")
    usuario = models.Usuario(
        username=dados.username,
        senha_hash=seguranca.gerar_hash(dados.senha),  # guarda o hash, não a senha
        papel=dados.papel,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.patch("/{usuario_id}", response_model=schemas.UsuarioResposta)
def atualizar_usuario(
    usuario_id: int,
    dados: schemas.UsuarioAtualizar,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(exigir_admin),  # quem está fazendo a alteração
):
    """Troca a senha, o papel ou ativa/desativa um usuário."""
    usuario = db.get(models.Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    mudancas = dados.model_dump(exclude_none=True)

    # Proteção contra se trancar para fora do próprio sistema.
    if usuario.id == admin.id and (
        mudancas.get("ativo") is False or mudancas.get("papel", "admin") != "admin"
    ):
        raise HTTPException(
            status_code=400,
            detail="Você não pode desativar nem rebaixar a própria conta",
        )

    senha = mudancas.pop("senha", None)
    if senha:
        usuario.senha_hash = seguranca.gerar_hash(senha)
    for campo, valor in mudancas.items():
        setattr(usuario, campo, valor)

    db.commit()
    db.refresh(usuario)
    return usuario