# Funções de segurança: hash de senha e tokens JWT.
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from . import config


def gerar_hash(senha: str) -> str:
    """Transforma a senha num hash (sem volta). O bcrypt já embute o 'sal'."""
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_senha(senha: str, senha_hash: str) -> bool:
    """Confere se a senha digitada corresponde ao hash guardado."""
    try:
        return bcrypt.checkpw(senha.encode("utf-8"), senha_hash.encode("utf-8"))
    except ValueError:  # senha acima de 72 bytes, hash malformado etc.
        return False


# Hash "de mentira", usado quando o usuário não existe. Assim o tempo de
# resposta é parecido nos dois casos e ninguém descobre quais usernames existem.
HASH_FALSO = gerar_hash("senha-falsa-apenas-para-igualar-o-tempo")


def criar_token(usuario_id: int) -> str:
    """Cria um token assinado, com data de validade."""
    expira = datetime.now(timezone.utc) + timedelta(minutes=config.EXPIRA_EM_MINUTOS)
    # "sub" (subject) = de quem é o token. Precisa ser texto.
    return jwt.encode(
        {"sub": str(usuario_id), "exp": expira},
        config.SECRET_KEY,
        algorithm=config.ALGORITMO,
    )


def ler_token(token: str) -> int | None:
    """Devolve o id do usuário do token, ou None se inválido ou expirado."""
    try:
        dados = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITMO])
        return int(dados["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None