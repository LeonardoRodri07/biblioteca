// Camada de API: todas as chamadas HTTP ficam aqui.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const CHAVE_TOKEN = "biblioteca_access_token";

export const obterToken = () => localStorage.getItem(CHAVE_TOKEN);

export const salvarToken = (token) => localStorage.setItem(CHAVE_TOKEN, token);

export const removerToken = () => localStorage.removeItem(CHAVE_TOKEN);

async function requisicao(caminho, opcoes = {}) {
  const cabecalhos = {};
  if (opcoes.body instanceof FormData) {
    // O navegador define o Content-Type e o boundary do multipart.
  } else if (opcoes.body instanceof URLSearchParams) {
    cabecalhos["Content-Type"] = "application/x-www-form-urlencoded";
  } else {
    cabecalhos["Content-Type"] = "application/json";
  }

  const token = obterToken();
  if (token) cabecalhos.Authorization = `Bearer ${token}`;

  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    ...opcoes,
    headers: { ...cabecalhos, ...opcoes.headers },
  });

  if (resposta.status === 204) return null;

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    const detalhe = Array.isArray(dados.detail)
      ? dados.detail.map((d) => d.msg).join("; ")
      : dados.detail;
    const erro = new Error(detalhe || "Erro inesperado");
    erro.status = resposta.status;
    if (resposta.status === 401 && caminho !== "/api/auth/login") {
      removerToken();
      window.dispatchEvent(new Event("biblioteca:unauthorized"));
    }
    throw erro;
  }
  return dados;
}

export const entrar = (username, password) =>
  requisicao(
    "/api/auth/login",
    {
      method: "POST",
      body: new URLSearchParams({ username, password }),
    },
  );

export const usuarioAtual = () => requisicao("/api/auth/eu");

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