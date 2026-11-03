# Rotas de empréstimo.
# O bibliotecário (admin) registra, renova e devolve.
# O usuário comum só consulta os PRÓPRIOS empréstimos.
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db
from ..datas import hoje
from ..dependencias import exigir_admin, usuario_atual

# Regras do negócio, num lugar só (fácil de mudar).
PRAZO_PADRAO_DIAS = 14
PRAZO_MAXIMO_DIAS = 90
DIAS_POR_RENOVACAO = 14
MAX_RENOVACOES = 2

router = APIRouter(prefix="/api/emprestimos", tags=["Empréstimos"])


def _com_relacoes(consulta):
    """Carrega livro e usuário junto, para a resposta sempre ter título e nome."""
    return consulta.options(
        joinedload(models.Emprestimo.livro),
        joinedload(models.Emprestimo.usuario),
    )


# Ativos primeiro, e dentro deles os que vencem antes (os atrasados no topo).
def _ordenar(consulta):
    return consulta.order_by(
        models.Emprestimo.data_devolucao.is_not(None),
        models.Emprestimo.data_vencimento,
        models.Emprestimo.id,
    )


def buscar_emprestimo(emprestimo_id: int, db: Session) -> models.Emprestimo:
    emprestimo = db.scalar(
        _com_relacoes(select(models.Emprestimo).where(models.Emprestimo.id == emprestimo_id))
    )
    if emprestimo is None:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
    return emprestimo


# ----- CONSULTAS -----

@router.get(
    "",
    response_model=list[schemas.EmprestimoResposta],
    dependencies=[Depends(exigir_admin)],
)
def listar_emprestimos(
    apenas_ativos: bool = False,      # /api/emprestimos?apenas_ativos=true
    usuario_id: int | None = None,    # /api/emprestimos?usuario_id=2
    livro_id: int | None = None,
    db: Session = Depends(get_db),
):
    """Lista todos os empréstimos (só bibliotecário)."""
    consulta = _com_relacoes(select(models.Emprestimo))
    if apenas_ativos:
        consulta = consulta.where(models.Emprestimo.data_devolucao.is_(None))
    if usuario_id is not None:
        consulta = consulta.where(models.Emprestimo.usuario_id == usuario_id)
    if livro_id is not None:
        consulta = consulta.where(models.Emprestimo.livro_id == livro_id)
    return db.scalars(_ordenar(consulta)).all()


# "/meus" fica ANTES de qualquer rota com "{id}" para não ser confundido com um id.
@router.get("/meus", response_model=list[schemas.EmprestimoResposta])
def meus_emprestimos(
    usuario: models.Usuario = Depends(usuario_atual),
    db: Session = Depends(get_db),
):
    """Os empréstimos de quem está logado (qualquer pessoa)."""
    consulta = _com_relacoes(select(models.Emprestimo)).where(
        models.Emprestimo.usuario_id == usuario.id
    )
    return db.scalars(_ordenar(consulta)).all()


# ----- AÇÕES (só bibliotecário) -----

@router.post(
    "",
    response_model=schemas.EmprestimoResposta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_admin)],
)
def registrar_emprestimo(dados: schemas.EmprestimoCriar, db: Session = Depends(get_db)):
    """Registra que um usuário pegou um livro emprestado."""
    livro = db.get(models.Livro, dados.livro_id)
    if livro is None:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    usuario = db.get(models.Usuario, dados.usuario_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if not usuario.ativo:
        raise HTTPException(status_code=400, detail="Esta conta de usuário está desativada")
    if not livro.disponivel:
        raise HTTPException(status_code=409, detail="Este livro não está disponível para empréstimo")

    data_hoje = hoje()
    vencimento = dados.data_vencimento or data_hoje + timedelta(days=PRAZO_PADRAO_DIAS)
    if vencimento <= data_hoje:
        raise HTTPException(status_code=400, detail="O vencimento deve ser depois de hoje")
    if vencimento > data_hoje + timedelta(days=PRAZO_MAXIMO_DIAS):
        raise HTTPException(
            status_code=400,
            detail=f"O prazo máximo é de {PRAZO_MAXIMO_DIAS} dias",
        )

    emprestimo = models.Emprestimo(
        livro_id=livro.id,
        usuario_id=usuario.id,
        data_emprestimo=data_hoje,
        data_vencimento=vencimento,
    )
    livro.disponivel = False  # o livro sai da prateleira
    db.add(emprestimo)
    try:
        db.commit()
    except IntegrityError:
        # O índice único recusou: outro empréstimo ativo do mesmo livro, simultâneo.
        db.rollback()
        raise HTTPException(status_code=409, detail="Este livro já está emprestado")
    return buscar_emprestimo(emprestimo.id, db)


@router.post(
    "/{emprestimo_id}/devolver",
    response_model=schemas.EmprestimoResposta,
    dependencies=[Depends(exigir_admin)],
)
def devolver(emprestimo_id: int, db: Session = Depends(get_db)):
    """Registra a devolução: o livro volta a ficar disponível."""
    emprestimo = buscar_emprestimo(emprestimo_id, db)
    if emprestimo.data_devolucao:
        raise HTTPException(status_code=409, detail="Este empréstimo já foi devolvido")
    emprestimo.data_devolucao = hoje()
    emprestimo.livro.disponivel = True
    db.commit()
    return buscar_emprestimo(emprestimo_id, db)


@router.post(
    "/{emprestimo_id}/renovar",
    response_model=schemas.EmprestimoResposta,
    dependencies=[Depends(exigir_admin)],
)
def renovar(emprestimo_id: int, db: Session = Depends(get_db)):
    """Estende o vencimento em 14 dias (máximo de 2 renovações, e não se estiver atrasado)."""
    emprestimo = buscar_emprestimo(emprestimo_id, db)
    if emprestimo.data_devolucao:
        raise HTTPException(status_code=409, detail="Este empréstimo já foi devolvido")
    if emprestimo.situacao == "atrasado":
        raise HTTPException(
            status_code=400,
            detail="Empréstimo atrasado: registre a devolução (não pode ser renovado)",
        )
    if emprestimo.renovacoes >= MAX_RENOVACOES:
        raise HTTPException(
            status_code=400,
            detail=f"Limite de {MAX_RENOVACOES} renovações atingido",
        )
    emprestimo.data_vencimento += timedelta(days=DIAS_POR_RENOVACAO)
    emprestimo.renovacoes += 1
    db.commit()
    return buscar_emprestimo(emprestimo_id, db)