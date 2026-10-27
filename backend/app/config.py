# Lê as configurações do arquivo backend/.env.
import os
from pathlib import Path

from dotenv import load_dotenv

# backend/.env (dois níveis acima deste arquivo)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    # Falhar cedo e com mensagem clara é melhor que rodar sem segurança.
    raise RuntimeError(
        "SECRET_KEY não definida. Crie o arquivo backend/.env (veja .env.example)."
    )

ALGORITMO = "HS256"  # algoritmo de assinatura do token
EXPIRA_EM_MINUTOS = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

# Dados do primeiro administrador (criado só se ainda não existir nenhum).
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
# Código geral que dá permissão de bibliotecário no cadastro.
# Se não estiver definido, o cadastro como bibliotecário fica desativado.
BIBLIOTECARIO_CODE = os.getenv("BIBLIOTECARIO_CODE")