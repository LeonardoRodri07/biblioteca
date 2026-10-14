from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

# prefix: todas as rotas começam com /livros
# tags: agrupa as rotas no Swagger
router = APIRouter(prefix="/livros", tags=["Livros"])


@router.get("/", response_model=List[schemas.LivroOut])
def listar_livros(db: Session = Depends(get_db)):
    """Lista todos os livros."""
    return db.query(models.Livro).all()


@router.get("/{livro_id}", response_model=schemas.LivroOut)
def buscar_livro(livro_id: int, db: Session = Depends(get_db)):
    """Busca um livro pelo id."""
    livro = db.get(models.Livro, livro_id)
    if not livro:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    return livro


@router.post("/", response_model=schemas.LivroOut, status_code=201)
def criar_livro(dados: schemas.LivroCreate, db: Session = Depends(get_db)):
    """Cadastra um novo livro."""
    livro = models.Livro(**dados.model_dump())
    db.add(livro)
    db.commit()
    db.refresh(livro)  # recarrega para pegar o id gerado
    return livro


@router.put("/{livro_id}", response_model=schemas.LivroOut)
def atualizar_livro(livro_id: int, dados: schemas.LivroUpdate, db: Session = Depends(get_db)):
    """Atualiza apenas os campos enviados."""
    livro = db.get(models.Livro, livro_id)
    if not livro:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    # exclude_unset: ignora campos que o cliente não mandou
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(livro, campo, valor)
    db.commit()
    db.refresh(livro)
    return livro


@router.delete("/{livro_id}", status_code=204)
def deletar_livro(livro_id: int, db: Session = Depends(get_db)):
    """Remove um livro."""
    livro = db.get(models.Livro, livro_id)
    if not livro:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    db.delete(livro)
    db.commit()
