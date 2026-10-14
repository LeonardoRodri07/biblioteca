# Conexão com o banco de dados.
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# URL do banco. "sqlite:///./biblioteca.db" = arquivo biblioteca.db na pasta
# de onde o uvicorn foi iniciado (por isso rodamos em ~/biblioteca/backend).
# Para migrar para PostgreSQL no futuro, basta trocar esta linha, por exemplo:
# "postgresql://usuario:senha@localhost:5432/biblioteca"
DATABASE_URL = "sqlite:///./biblioteca.db"

# O "engine" é o motor que fala com o banco.
# check_same_thread=False é exigido pelo SQLite quando usado com FastAPI,
# pois o FastAPI pode atender requisições em threads diferentes.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Cada requisição abre uma "sessão" (uma conversa com o banco) a partir daqui.
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


# Classe base: todos os models (tabelas) herdam dela.
class Base(DeclarativeBase):
    pass


# Função de dependência: o FastAPI chama isto a cada requisição,
# entrega a sessão para a rota e fecha no final (mesmo se der erro).
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
