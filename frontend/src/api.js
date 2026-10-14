// Camada de API: todas as chamadas HTTP ficam aqui.
// A tela (App.jsx) não precisa saber como o fetch funciona.

// Endereço da API. No Vite, variáveis de ambiente começam com VITE_.
// Se não houver .env, usa o padrão local.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Função auxiliar: faz a chamada e trata erros de forma padronizada.
async function requisicao(caminho, opcoes = {}) {
  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    headers: { "Content-Type": "application/json" },
    ...opcoes,
  });

  // 204 = sucesso sem corpo (caso do DELETE).
  if (resposta.status === 204) return null;

  const dados = await resposta.json();

  // Se o status não for 2xx, transforma a resposta da API em um erro legível.
  if (!resposta.ok) {
    const detalhe = Array.isArray(dados.detail)
      ? dados.detail.map((d) => d.msg).join("; ") // erros 422 vêm em lista
      : dados.detail;                              // 404/409 vêm em texto
    throw new Error(detalhe || "Erro inesperado");
  }
  return dados;
}

export const listarLivros = () => requisicao("/api/livros");

export const criarLivro = (livro) =>
  requisicao("/api/livros", { method: "POST", body: JSON.stringify(livro) });

export const atualizarLivro = (id, mudancas) =>
  requisicao(`/api/livros/${id}`, {
    method: "PATCH",
    body: JSON.stringify(mudancas),
  });

export const apagarLivro = (id) =>
  requisicao(`/api/livros/${id}`, { method: "DELETE" });
