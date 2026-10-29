from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas, storage
from ..database import get_db
from ..dependencias import exigir_admin, usuario_atual

# Todas as rotas daqui exigem, no mínimo, estar logado.
# As que alteram dados ainda exigem admin (dependencies na própria rota).
router = APIRouter(
    prefix="/api/livros",
    tags=["Livros"],
    dependencies=[Depends(usuario_atual)],
)


def buscar_livro_ou_404(livro_id: int, db: Session) -> models.Livro:
    livro = db.get(models.Livro, livro_id)
    if livro is None:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    return livro


def verificar_isbn_duplicado(isbn: str | None, db: Session, ignorar_id: int | None = None):
    if not isbn:
        return
    existente = db.scalar(select(models.Livro).where(models.Livro.isbn == isbn))
    if existente and existente.id != ignorar_id:
        raise HTTPException(status_code=409, detail="Já existe um livro com esse ISBN")


# NOVO: evita categorias "duplicadas" só por maiúsculas/minúsculas.
# Se já existe "Romance" e chega "romance", devolve "Romance".
def canonizar_categoria(categoria: str | None, db: Session, ignorar_id: int | None = None) -> str | None:
    if not categoria:
        return None
    consulta = select(models.Livro.categoria).where(models.Livro.categoria.is_not(None)).distinct()
    if ignorar_id is not None:
        # Ignora o próprio livro, para permitir corrigir a grafia dele.
        consulta = consulta.where(models.Livro.id != ignorar_id)
    for existente in db.scalars(consulta).all():
        if existente.casefold() == categoria.casefold():
            return existente
    return categoria


# ----- LEITURA: qualquer pessoa logada -----

@router.get("", response_model=list[schemas.LivroResposta])
def listar_livros(
    disponivel: bool | None = None,   # /api/livros?disponivel=true
    categoria: str | None = None,     # NOVO: /api/livros?categoria=Romance
    db: Session = Depends(get_db),
):
    """Lista os livros, com filtros opcionais de disponibilidade e categoria."""
    consulta = select(models.Livro).order_by(models.Livro.id)
    if disponivel is not None:
        consulta = consulta.where(models.Livro.disponivel == disponivel)
    if categoria is not None:
        # Aceita "romance" ou "Romance": usa a grafia que está guardada.
        consulta = consulta.where(models.Livro.categoria == canonizar_categoria(categoria, db))
    return db.scalars(consulta).all()


@router.get("/{livro_id}", response_model=schemas.LivroResposta)
def obter_livro(livro_id: int, db: Session = Depends(get_db)):
    """Busca um livro pelo id."""
    return buscar_livro_ou_404(livro_id, db)


# ----- ESCRITA: somente admin -----

@router.post(
    "",
    response_model=schemas.LivroResposta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_admin)],
)
def criar_livro(dados: schemas.LivroCriar, db: Session = Depends(get_db)):
    """Cadastra um novo livro (a capa é enviada depois, em /capa)."""
    verificar_isbn_duplicado(dados.isbn, db)
    campos = dados.model_dump()
    campos["categoria"] = canonizar_categoria(campos["categoria"], db)  # NOVO
    livro = models.Livro(**campos)
    db.add(livro)
    db.commit()
    db.refresh(livro)
    return livro


@router.patch(
    "/{livro_id}",
    response_model=schemas.LivroResposta,
    dependencies=[Depends(exigir_admin)],
)
def atualizar_livro(livro_id: int, dados: schemas.LivroAtualizar, db: Session = Depends(get_db)):
    """Atualiza apenas os campos enviados."""
    livro = buscar_livro_ou_404(livro_id, db)
    mudancas = dados.model_dump(exclude_unset=True)
    if "isbn" in mudancas:
        verificar_isbn_duplicado(mudancas["isbn"], db, ignorar_id=livro_id)
    if "categoria" in mudancas:  # NOVO
        mudancas["categoria"] = canonizar_categoria(mudancas["categoria"], db, ignorar_id=livro_id)
    for campo, valor in mudancas.items():
        setattr(livro, campo, valor)
    db.commit()
    db.refresh(livro)
    return livro


@router.delete(
    "/{livro_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exigir_admin)],
)
def apagar_livro(livro_id: int, db: Session = Depends(get_db)):
    """Remove um livro (e a imagem da capa, se houver)."""
    livro = buscar_livro_ou_404(livro_id, db)
    storage.remover_capa(livro.capa)
    db.delete(livro)
    db.commit()


@router.post(
    "/{livro_id}/capa",
    response_model=schemas.LivroResposta,
    dependencies=[Depends(exigir_admin)],
)
async def enviar_capa(
    livro_id: int,
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Envia (ou troca) a imagem de capa. Aceita JPG, PNG ou WEBP até 2 MB."""
    livro = buscar_livro_ou_404(livro_id, db)
    novo_nome = await storage.salvar_capa(arquivo)
    storage.remover_capa(livro.capa)
    livro.capa = novo_nome
    db.commit()
    db.refresh(livro)
    return livro


@router.delete(
    "/{livro_id}/capa",
    response_model=schemas.LivroResposta,
    dependencies=[Depends(exigir_admin)],
)
def remover_capa_do_livro(livro_id: int, db: Session = Depends(get_db)):
    """Remove a imagem de capa do livro."""
    livro = buscar_livro_ou_404(livro_id, db)
    storage.remover_capa(livro.capa)
    livro.capa = None
    db.commit()
    db.refresh(livro)
    return livro