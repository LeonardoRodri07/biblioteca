# Rotas de autenticação: login, cadastro e "quem sou eu".
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import config, models, schemas, seguranca
from ..database import get_db
from ..dependencias import usuario_atual
from ..limitador import LimitadorDeFalhas

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])

# 5 códigos errados em 15 minutos (por IP) bloqueiam novas tentativas.
limitador_codigo = LimitadorDeFalhas(maximo=5, janela_segundos=15 * 60)


@router.post("/login", response_model=schemas.Token)
def login(
    formulario: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Confere usuário e senha e devolve um token de acesso."""
    usuario = db.scalar(
        select(models.Usuario).where(models.Usuario.username == formulario.username)
    )
    hash_conferido = usuario.senha_hash if usuario else seguranca.HASH_FALSO
    senha_ok = seguranca.verificar_senha(formulario.password, hash_conferido)

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


# NOVO: autocadastro. Público (não exige login).
@router.post("/registro", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def registrar(
    dados: schemas.UsuarioRegistro,
    request: Request,
    db: Session = Depends(get_db),
):
    """Cria uma conta. Sem código = usuário comum; com o código certo = bibliotecário."""
    ip = request.client.host if request.client else "desconhecido"
    papel = "usuario"

    if dados.codigo_bibliotecario:
        limitador_codigo.verificar(ip)  # já errou demais? responde 429
        # compare_digest compara em tempo constante (não vaza pistas pelo tempo).
        # Se o código não está configurado no .env, ninguém vira bibliotecário.
        codigo_certo = bool(config.BIBLIOTECARIO_CODE) and secrets.compare_digest(
            dados.codigo_bibliotecario.encode("utf-8"),
            config.BIBLIOTECARIO_CODE.encode("utf-8"),
        )
        if not codigo_certo:
            limitador_codigo.registrar_falha(ip)
            raise HTTPException(status_code=403, detail="Código de bibliotecário inválido")
        limitador_codigo.zerar(ip)
        papel = "admin"

    existente = db.scalar(
        select(models.Usuario).where(models.Usuario.username == dados.username)
    )
    if existente:
        raise HTTPException(status_code=409, detail="Esse nome de usuário já existe")

    usuario = models.Usuario(
        username=dados.username,
        senha_hash=seguranca.gerar_hash(dados.senha),
        papel=papel,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    # Já devolve o token: a pessoa entra logada logo após criar a conta.
    return schemas.Token(access_token=seguranca.criar_token(usuario.id), usuario=usuario)


@router.get("/eu", response_model=schemas.UsuarioResposta)
def quem_sou_eu(usuario: models.Usuario = Depends(usuario_atual)):
    """Devolve os dados de quem está logado (o frontend usa ao recarregar a página)."""
    return usuario