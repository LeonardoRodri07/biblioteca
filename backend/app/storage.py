# Guarda e remove as imagens de capa no disco.
# Isolamos isso num arquivo próprio: se um dia as imagens forem para a
# nuvem (ex.: S3), só este arquivo muda.
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile

# Pasta backend/uploads (dois níveis acima deste arquivo).
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)  # cria a pasta se não existir

# Só aceitamos estes tipos. A extensão do arquivo salvo vem DAQUI,
# nunca do nome que o usuário mandou (mais seguro).
TIPOS_PERMITIDOS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

# Tamanho máximo: 2 MB.
TAMANHO_MAXIMO = 2 * 1024 * 1024


async def salvar_capa(arquivo: UploadFile) -> str:
    """Valida e salva a imagem. Devolve o nome do arquivo salvo."""
    extensao = TIPOS_PERMITIDOS.get(arquivo.content_type)
    if extensao is None:
        raise HTTPException(
            status_code=415,
            detail="Formato não suportado. Envie JPG, PNG ou WEBP.",
        )

    # Lê no máximo 1 byte a mais que o limite, só para saber se estourou.
    conteudo = await arquivo.read(TAMANHO_MAXIMO + 1)
    if len(conteudo) > TAMANHO_MAXIMO:
        raise HTTPException(status_code=413, detail="Imagem maior que 2 MB.")

    # Nome aleatório: evita nomes repetidos e nomes maliciosos.
    nome = f"{uuid4().hex}{extensao}"
    (UPLOAD_DIR / nome).write_bytes(conteudo)
    return nome


def remover_capa(nome: str | None) -> None:
    """Apaga a imagem do disco (se existir)."""
    if nome:
        (UPLOAD_DIR / nome).unlink(missing_ok=True)