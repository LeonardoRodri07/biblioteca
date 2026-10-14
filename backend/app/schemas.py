from typing import Optional
from pydantic import BaseModel, ConfigDict


class LivroBase(BaseModel):
    """Campos comuns a criação e leitura."""
    titulo: str
    autor: str
    ano: Optional[int] = None
    disponivel: bool = True


class LivroCreate(LivroBase):
    """O que o cliente envia no POST (não inclui id, o banco gera)."""
    pass


class LivroUpdate(BaseModel):
    """No PUT/PATCH tudo é opcional: atualiza só o que for enviado."""
    titulo: Optional[str] = None
    autor: Optional[str] = None
    ano: Optional[int] = None
    disponivel: Optional[bool] = None


class LivroOut(LivroBase):
    """O que a API devolve (inclui o id)."""
    id: int
    # permite converter direto de um objeto SQLAlchemy para JSON
    model_config = ConfigDict(from_attributes=True)
