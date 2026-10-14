# Define a tabela "livros" no banco.
from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Livro(Base):
    # Nome da tabela no banco.
    __tablename__ = "livros"

    # Chave primária: número único de cada livro, gerado automaticamente.
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Campos obrigatórios (não aceitam vazio/nulo).
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    autor: Mapped[str] = mapped_column(String(120), nullable=False)

    # Campos opcionais (podem ser None).
    ano_publicacao: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # ISBN é o "código de barras" do livro; não pode se repetir (unique).
    isbn: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)

    # Indica se o livro está disponível para empréstimo. Começa como True.
    disponivel: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)