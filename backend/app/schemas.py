from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Campos comuns a todos os schemas de livro.
class LivroBase(BaseModel):
    # Field(...) adiciona regras de validação.
    titulo: str = Field(min_length=1, max_length=200, examples=["Dom Casmurro"])
    autor: str = Field(min_length=1, max_length=120, examples=["Machado de Assis"])
    ano_publicacao: int | None = Field(default=None, ge=1000, le=2100, examples=[1899])
    isbn: str | None = Field(default=None, max_length=20, examples=["9788535902778"])


# Dados recebidos ao CRIAR um livro (POST).
class LivroCriar(LivroBase):
    # "disponivel" é opcional na criação; se não vier, assume True.
    disponivel: bool = True


# Dados recebidos ao ATUALIZAR um livro (PATCH).
# Todos opcionais: o cliente envia só o que quer mudar.
class LivroAtualizar(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=200)
    autor: str | None = Field(default=None, min_length=1, max_length=120)
    ano_publicacao: int | None = Field(default=None, ge=1000, le=2100)
    isbn: str | None = Field(default=None, max_length=20)
    disponivel: bool | None = None


# Dados devolvidos pela API (inclui o id gerado pelo banco).
class LivroResposta(LivroBase):
    id: int
    disponivel: bool
    # NOVO: nome do arquivo da capa (o frontend monta a URL completa).
    capa: str | None = None

    model_config = ConfigDict(from_attributes=True)

# ===================== USUÁRIOS E LOGIN =====================

# O bcrypt só considera os primeiros 72 bytes da senha.
# Recusamos senhas maiores em vez de cortá-las em silêncio.
def _validar_tamanho_senha(valor: str | None) -> str | None:
    if valor is not None and len(valor.encode("utf-8")) > 72:
        raise ValueError("Senha muito longa (máximo de 72 bytes)")
    return valor


# Dados recebidos ao CRIAR um usuário.
class UsuarioCriar(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_.-]+$",
                          examples=["maria"])
    senha: str = Field(min_length=8, max_length=72)
    papel: Literal["admin", "usuario"] = "usuario"

    _checar_senha = field_validator("senha")(_validar_tamanho_senha)


# Dados recebidos ao ATUALIZAR um usuário (todos opcionais).
class UsuarioAtualizar(BaseModel):
    senha: str | None = Field(default=None, min_length=8, max_length=72)
    papel: Literal["admin", "usuario"] | None = None
    ativo: bool | None = None

    _checar_senha = field_validator("senha")(_validar_tamanho_senha)


# Dados devolvidos. NUNCA inclui a senha nem o hash.
class UsuarioResposta(BaseModel):
    id: int
    username: str
    papel: str
    ativo: bool

    model_config = ConfigDict(from_attributes=True)


# Resposta do login.
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioResposta