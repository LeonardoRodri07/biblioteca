# Router: agrupa todas as rotas relacionadas a livros.
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas, storage
from ..database import get_db

router = APIRouter(prefix="/api/livros", tags=["Livros"])


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


@router.post("", response_model=schemas.LivroResposta, status_code=status.HTTP_201_CREATED)
def criar_livro(dados: schemas.LivroCriar, db: Session = Depends(get_db)):
    """Cadastra um novo livro (a capa é enviada depois, em /capa)."""
    verificar_isbn_duplicado(dados.isbn, db)
    livro = models.Livro(**dados.model_dump())
    db.add(livro)
    db.commit()
    db.refresh(livro)
    return livro


@router.get("", response_model=list[schemas.LivroResposta])
def listar_livros(disponivel: bool | None = None, db: Session = Depends(get_db)):
    """Lista todos os livros (com filtro opcional de disponibilidade)."""
    consulta = select(models.Livro).order_by(models.Livro.id)
    if disponivel is not None:
        consulta = consulta.where(models.Livro.disponivel == disponivel)
    return db.scalars(consulta).all()


@router.get("/{livro_id}", response_model=schemas.LivroResposta)
def obter_livro(livro_id: int, db: Session = Depends(get_db)):
    """Busca um livro pelo id."""
    return buscar_livro_ou_404(livro_id, db)


@router.patch("/{livro_id}", response_model=schemas.LivroResposta)
def atualizar_livro(livro_id: int, dados: schemas.LivroAtualizar, db: Session = Depends(get_db)):
    """Atualiza apenas os campos enviados."""
    livro = buscar_livro_ou_404(livro_id, db)
    mudancas = dados.model_dump(exclude_unset=True)
    if "isbn" in mudancas:
        verificar_isbn_duplicado(mudancas["isbn"], db, ignorar_id=livro_id)
    for campo, valor in mudancas.items():
        setattr(livro, campo, valor)
    db.commit()
    db.refresh(livro)
    return livro


@router.delete("/{livro_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar_livro(livro_id: int, db: Session = Depends(get_db)):
    """Remove um livro (e a imagem da capa, se houver)."""
    livro = buscar_livro_ou_404(livro_id, db)
    storage.remover_capa(livro.capa)  # NOVO: não deixa imagem "órfã" no disco
    db.delete(livro)
    db.commit()


# NOVO: enviar/trocar a capa. POST /api/livros/{id}/capa
# "async def" porque a leitura do arquivo é assíncrona.
@router.post("/{livro_id}/capa", response_model=schemas.LivroResposta)
async def enviar_capa(
    livro_id: int,
    arquivo: UploadFile = File(...),  # o arquivo vem num formulário multipart
    db: Session = Depends(get_db),
):
    """Envia (ou troca) a imagem de capa do livro. Aceita JPG, PNG ou WEBP até 2 MB."""
    livro = buscar_livro_ou_404(livro_id, db)
    novo_nome = await storage.salvar_capa(arquivo)  # valida e salva no disco
    storage.remover_capa(livro.capa)                # apaga a capa antiga
    livro.capa = novo_nome
    db.commit()
    db.refresh(livro)
    return livro


# NOVO: remover a capa. DELETE /api/livros/{id}/capa
@router.delete("/{livro_id}/capa", response_model=schemas.LivroResposta)
def remover_capa_do_livro(livro_id: int, db: Session = Depends(get_db)):
    """Remove a imagem de capa do livro."""
    livro = buscar_livro_ou_404(livro_id, db)
    storage.remover_capa(livro.capa)
    livro.capa = None
    db.commit()
    db.refresh(livro)
    return livro