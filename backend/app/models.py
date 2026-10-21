from sqlalchemy import Boolean, Integer, String, Text
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
    capa: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sinopse: Mapped[str | None] = mapped_column(Text, nullable=True)

# NOVO: quem pode entrar no sistema.
class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # Nome de login, único.
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    # Guardamos só o HASH da senha, nunca a senha.
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # "admin" ou "usuario".
    papel: Mapped[str] = mapped_column(String(20), default="usuario", nullable=False)
    # Conta desativada não consegue entrar (sem precisar apagar o histórico).
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)