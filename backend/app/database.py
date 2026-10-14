from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite: o banco é um único arquivo (biblioteca.db) criado automaticamente
DATABASE_URL = "sqlite:///./biblioteca.db"

# engine = "ponte" entre o Python e o banco
# check_same_thread=False é necessário só para SQLite com FastAPI
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# SessionLocal = fábrica de sessões (cada requisição abre e fecha uma)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Base = classe mãe de todos os models (tabelas)
Base = declarative_base()


def get_db():
    """Dependência do FastAPI: abre uma sessão por requisição e fecha no fim."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
