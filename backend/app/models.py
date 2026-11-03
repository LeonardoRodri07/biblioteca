from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base
from .datas import hoje

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
    # NOVO: categoria do livro (ex.: "Romance"). None = sem categoria.
    categoria: Mapped[str | None] = mapped_column(String(60), nullable=True)
        # NOVO: histórico de empréstimos deste livro.
    # cascade: ao apagar o livro, o histórico dele vai junto.
    emprestimos: Mapped[list["Emprestimo"]] = relationship(
        back_populates="livro", cascade="all, delete-orphan"
    )


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

    # NOVO: um empréstimo = um livro com uma pessoa, até uma data.
class Emprestimo(Base):
    __tablename__ = "emprestimos"
    __table_args__ = (
        # Índice único PARCIAL: só pode existir UM empréstimo sem devolução
        # por livro. Mesmo se duas pessoas clicarem ao mesmo tempo,
        # o banco recusa a segunda.
        Index(
            "ux_emprestimo_ativo_por_livro",
            "livro_id",
            unique=True,
            sqlite_where=text("data_devolucao IS NULL"),
            postgresql_where=text("data_devolucao IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    livro_id: Mapped[int] = mapped_column(ForeignKey("livros.id"), nullable=False, index=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False, index=True)
    data_emprestimo: Mapped[date] = mapped_column(Date, nullable=False)
    data_vencimento: Mapped[date] = mapped_column(Date, nullable=False)
    # None = ainda não devolvido.
    data_devolucao: Mapped[date | None] = mapped_column(Date, nullable=True)
    renovacoes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    livro: Mapped["Livro"] = relationship(back_populates="emprestimos")
    usuario: Mapped["Usuario"] = relationship()

    # ----- Campos calculados (a API os devolve junto) -----
    @property
    def situacao(self) -> str:
        """'devolvido', 'atrasado' (venceu e não devolveu) ou 'ativo'."""
        if self.data_devolucao:
            return "devolvido"
        return "atrasado" if self.data_vencimento < hoje() else "ativo"

    @property
    def dias_restantes(self) -> int | None:
        """Dias até o vencimento (negativo = dias de atraso). None se já devolvido."""
        if self.data_devolucao:
            return None
        return (self.data_vencimento - hoje()).days

    @property
    def livro_titulo(self) -> str:
        return self.livro.titulo

    @property
    def livro_capa(self) -> str | None:
        return self.livro.capa

    @property
    def usuario_username(self) -> str:
        return self.usuario.username