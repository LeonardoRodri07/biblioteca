# Schemas Pydantic: validam os dados que entram e saem da API.
from pydantic import BaseModel, ConfigDict, Field


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