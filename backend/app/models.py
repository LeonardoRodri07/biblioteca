# Define a tabela "livros" no banco.
from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Livro(Base):
    __tablename__ = "livros"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    autor: Mapped[str] = mapped_column(String(120), nullable=False)
    ano_publicacao: Mapped[int | None] = mapped_column(Integer, nullable=True)
    isbn: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    disponivel: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # NOVO: nome do arquivo da capa (ex.: "a1b2c3.jpg"). None = sem capa.
    capa: Mapped[str | None] = mapped_column(String(255), nullable=True)