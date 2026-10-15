// Camada de API: todas as chamadas HTTP ficam aqui.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function requisicao(caminho, opcoes = {}) {
  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    // JSON precisa do cabeçalho Content-Type. Já o FormData (upload de
    // arquivo) NÃO: o navegador define sozinho, com um código interno.
    headers:
      opcoes.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" },
    ...opcoes,
  });

  if (resposta.status === 204) return null;

  const dados = await resposta.json();

  if (!resposta.ok) {
    const detalhe = Array.isArray(dados.detail)
      ? dados.detail.map((d) => d.msg).join("; ")
      : dados.detail;
    throw new Error(detalhe || "Erro inesperado");
  }
  return dados;
}

// NOVO: monta a URL completa da imagem a partir do nome do arquivo.
// Devolve null se o livro não tem capa.
export const urlCapa = (nome) => (nome ? `${BASE_URL}/api/capas/${nome}` : null);

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

// NOVO: envia a imagem. O nome do campo ("arquivo") precisa ser igual
// ao parâmetro da rota no backend.
export const enviarCapa = (id, arquivo) => {
  const formulario = new FormData();
  formulario.append("arquivo", arquivo);
  return requisicao(`/api/livros/${id}/capa`, {
    method: "POST",
    body: formulario,
  });
};

// NOVO: remove a capa do livro.
export const apagarCapa = (id) =>
  requisicao(`/api/livros/${id}/capa`, { method: "DELETE" });