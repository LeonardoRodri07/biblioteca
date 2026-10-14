# Router: agrupa todas as rotas relacionadas a livros.
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

# prefix: todas as rotas daqui começam com /api/livros
# tags: agrupa as rotas numa seção "Livros" no Swagger
router = APIRouter(prefix="/api/livros", tags=["Livros"])


# Função auxiliar: busca um livro ou devolve erro 404.
def buscar_livro_ou_404(livro_id: int, db: Session) -> models.Livro:
    livro = db.get(models.Livro, livro_id)
    if livro is None:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    return livro


# Função auxiliar: impede dois livros com o mesmo ISBN.
def verificar_isbn_duplicado(isbn: str | None, db: Session, ignorar_id: int | None = None):
    if not isbn:
        return
    existente = db.scalar(select(models.Livro).where(models.Livro.isbn == isbn))
    if existente and existente.id != ignorar_id:
        raise HTTPException(status_code=409, detail="Já existe um livro com esse ISBN")


# CRIAR: POST /api/livros
@router.post("", response_model=schemas.LivroResposta, status_code=status.HTTP_201_CREATED)
def criar_livro(dados: schemas.LivroCriar, db: Session = Depends(get_db)):
    """Cadastra um novo livro."""
    verificar_isbn_duplicado(dados.isbn, db)
    livro = models.Livro(**dados.model_dump())  # schema -> model
    db.add(livro)       # coloca na sessão
    db.commit()         # grava no banco
    db.refresh(livro)   # recarrega para pegar o id gerado
    return livro


# LISTAR: GET /api/livros
@router.get("", response_model=list[schemas.LivroResposta])
def listar_livros(
    disponivel: bool | None = None,  # filtro opcional: /api/livros?disponivel=true
    db: Session = Depends(get_db),
):
    """Lista todos os livros (com filtro opcional de disponibilidade)."""
    consulta = select(models.Livro).order_by(models.Livro.id)
    if disponivel is not None:
        consulta = consulta.where(models.Livro.disponivel == disponivel)
    return db.scalars(consulta).all()


# BUSCAR UM: GET /api/livros/{livro_id}
@router.get("/{livro_id}", response_model=schemas.LivroResposta)
def obter_livro(livro_id: int, db: Session = Depends(get_db)):
    """Busca um livro pelo id."""
    return buscar_livro_ou_404(livro_id, db)


# ATUALIZAR: PATCH /api/livros/{livro_id}
@router.patch("/{livro_id}", response_model=schemas.LivroResposta)
def atualizar_livro(livro_id: int, dados: schemas.LivroAtualizar, db: Session = Depends(get_db)):
    """Atualiza apenas os campos enviados."""
    livro = buscar_livro_ou_404(livro_id, db)
    # exclude_unset=True: só pega o que o cliente realmente enviou.
    mudancas = dados.model_dump(exclude_unset=True)
    if "isbn" in mudancas:
        verificar_isbn_duplicado(mudancas["isbn"], db, ignorar_id=livro_id)
    for campo, valor in mudancas.items():
        setattr(livro, campo, valor)
    db.commit()
    db.refresh(livro)
    return livro


# APAGAR: DELETE /api/livros/{livro_id}
@router.delete("/{livro_id}", status_code=status.HTTP_204_NO_CONTENT)
def apagar_livro(livro_id: int, db: Session = Depends(get_db)):
    """Remove um livro."""
    livro = buscar_livro_ou_404(livro_id, db)
    db.delete(livro)
    db.commit()
    