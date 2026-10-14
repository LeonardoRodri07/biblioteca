# Importa a classe principal do FastAPI.
from fastapi import FastAPI

# Cria a aplicação. Este objeto "app" é a nossa API inteira.
# Os parâmetros abaixo configuram a documentação automática (Swagger).
app = FastAPI(
    title="API Biblioteca de Livros",            # título que aparece no Swagger
    description="API para gerenciar uma biblioteca de livros (projeto de aprendizado).",
    version="0.1.0",                             # versão da API
    docs_url="/api/docs",                        # Swagger fica em /api/docs
    redoc_url="/api/redoc",                      # documentação alternativa (ReDoc)
    openapi_url="/api/openapi.json",             # arquivo JSON que descreve a API
)


# "@app.get" é um decorador: diz que a função logo abaixo
# responde a requisições do tipo GET no caminho indicado.
@app.get("/api/saude", tags=["Sistema"])
def verificar_saude():
    """Verifica se a API está funcionando (health check)."""
    # O FastAPI converte este dicionário Python em JSON automaticamente.
    return {"status": "ok", "mensagem": "API da biblioteca está no ar!"}