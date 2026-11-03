# "Hoje" no fuso do Brasil. O servidor pode estar em UTC, e depois das 21h
# em São Paulo já seria "amanhã" lá: isso bagunçaria os vencimentos.
from datetime import date, datetime
from zoneinfo import ZoneInfo

FUSO = ZoneInfo("America/Sao_Paulo")


def hoje() -> date:
    return datetime.now(FUSO).date()