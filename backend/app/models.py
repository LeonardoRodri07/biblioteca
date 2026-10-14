from sqlalchemy import Column, Integer, String, Boolean
from .database import Base


class Livro(Base):
    """Cada atributo vira uma coluna na tabela 'livros'."""
    __tablename__ = "livros"

    id = Column(Integer, primary_key=True, index=True)  # identificador único
    titulo = Column(String, nullable=False)              # obrigatório
    autor = Column(String, nullable=False)
    ano = Column(Integer, nullable=True)                 # opcional
    disponivel = Column(Boolean, default=True)           # está na estante?
