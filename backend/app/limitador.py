# Limitador simples de tentativas erradas, guardado em memória.
# Zera quando o servidor reinicia. Para produção real, use algo
# compartilhado (ex.: Redis) ou um limitador no proxy.
import time
from collections import defaultdict, deque

from fastapi import HTTPException, status


class LimitadorDeFalhas:
    def __init__(self, maximo: int, janela_segundos: int):
        self.maximo = maximo
        self.janela = janela_segundos
        self._falhas: dict[str, deque] = defaultdict(deque)

    def _limpar_antigas(self, chave: str) -> deque:
        fila = self._falhas[chave]
        limite = time.monotonic() - self.janela
        while fila and fila[0] < limite:
            fila.popleft()
        return fila

    def verificar(self, chave: str) -> None:
        """Lança erro 429 se a chave já estourou o limite de falhas."""
        if len(self._limpar_antigas(chave)) >= self.maximo:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Muitas tentativas. Aguarde alguns minutos e tente de novo.",
            )

    def registrar_falha(self, chave: str) -> None:
        self._limpar_antigas(chave).append(time.monotonic())

    def zerar(self, chave: str) -> None:
        self._falhas.pop(chave, None)