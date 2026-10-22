import { useCallback, useEffect, useState } from "react";
import {
  apagarCapa,
  apagarLivro,
  atualizarLivro,
  criarLivro,
  entrar as autenticar,
  enviarCapa,
  listarLivros,
  obterToken,
  removerToken,
  salvarToken,
  usuarioAtual,
} from "./api";
import CartaoLivro from "./components/CartaoLivro";
import DetalheLivro from "./components/DetalheLivro";
import Login from "./components/Login";
import ModalLivro from "./components/ModalLivro";
import "./App.css";

// Abas do menu lateral.
const ABAS = [
  { id: "inicio", rotulo: "Início", icone: "🏠" },
  { id: "pesquisar", rotulo: "Pesquisar", icone: "🔍" },
  { id: "catalogo", rotulo: "Catálogo", icone: "📖" },
];

// Grade de cartões. Fica FORA do App para não ser recriada a cada
// renderização (o que faria a busca perder o foco).
function Grade({
  lista,
  vazio,
  podeGerenciar,
  aoAbrir,
  aoEditar,
  aoAlternar,
  aoApagar,
}) {
  if (lista.length === 0) return <p className="vazio">{vazio}</p>;
  return (
    <div className="grade">
      {lista.map((livro) => (
        <CartaoLivro
          key={livro.id}
          livro={livro}
          podeGerenciar={podeGerenciar}
          aoAbrir={aoAbrir} // CORRIGIDO: antes não era repassado
          aoEditar={aoEditar}
          aoAlternar={aoAlternar}
          aoApagar={aoApagar}
        />
      ))}
    </div>
  );
}

export default function App() {
  const [livros, setLivros] = useState([]);
  const [aba, setAba] = useState("inicio");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos"); // todos | disponiveis | emprestados
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [usuario, setUsuario] = useState(null);

  // Detalhe: guardamos só o id; a janela sempre mostra o livro atualizado.
  const [detalheId, setDetalheId] = useState(null);
  const livroDetalhe = livros.find((l) => l.id === detalheId);

  // Janela de cadastro/edição: null = fechada; { livro: null } = novo; { livro } = edição.
  const [modal, setModal] = useState(null);

  const carregar = useCallback(async () => {
    try {
      setLivros(await listarLivros());
      setErro("");
    } catch (e) {
      setErro(
        e.status === 401
          ? "Sua sessão expirou. Entre novamente."
          : `Não foi possível carregar os livros: ${e.message}`
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  // Ao abrir a página: se há token guardado, valida no backend (GET /api/auth/eu).
  useEffect(() => {
    let ativo = true;

    async function restaurarSessao() {
      if (!obterToken()) {
        setCarregandoSessao(false);
        setCarregando(false);
        return;
      }
      try {
        const usuarioLogado = await usuarioAtual();
        if (!ativo) return;
        setUsuario(usuarioLogado);
        await carregar();
      } catch (e) {
        if (!ativo) return;
        removerToken();
        setUsuario(null);
        if (e.status !== 401) setErro(`Não foi possível validar a sessão: ${e.message}`);
      } finally {
        if (ativo) setCarregandoSessao(false);
      }
    }

    restaurarSessao();
    return () => {
      ativo = false;
    };
  }, [carregar]);

  // O api.js dispara este evento quando qualquer chamada devolve 401.
  useEffect(() => {
    function encerrarSessao() {
      setUsuario(null);
      setLivros([]);
      setModal(null);
      setDetalheId(null); // NOVO: fecha o detalhe
      setErro("Sua sessão expirou. Entre novamente.");
    }
    window.addEventListener("biblioteca:unauthorized", encerrarSessao);
    return () => window.removeEventListener("biblioteca:unauthorized", encerrarSessao);
  }, []);

  async function entrar(username, password) {
    const resposta = await autenticar(username, password);
    salvarToken(resposta.access_token);
    setUsuario(resposta.usuario);
    setErro("");
    setCarregando(true);
    await carregar();
  }

  function sair() {
    removerToken();
    setUsuario(null);
    setLivros([]);
    setModal(null);
    setDetalheId(null); // NOVO: fecha o detalhe
    setErro("");
  }

  // Chamada pelo modal ao clicar em "Salvar".
  // Se lançar erro, o próprio modal o mostra e continua aberto.
  async function salvarLivro({ dados, arquivo, tirarCapa }) {
    // 1) cria ou atualiza os dados do livro
    const salvo = modal.livro
      ? await atualizarLivro(modal.livro.id, dados)
      : await criarLivro(dados);

    // 2) cuida da capa: nova foto, ou remoção da atual
    if (arquivo) await enviarCapa(salvo.id, arquivo);
    else if (tirarCapa && salvo.capa) await apagarCapa(salvo.id);

    await carregar();
  }

  async function alternarDisponibilidade(livro) {
    try {
      await atualizarLivro(livro.id, { disponivel: !livro.disponivel });
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function remover(livro) {
    if (!window.confirm(`Apagar "${livro.titulo}"?`)) return;
    try {
      await apagarLivro(livro.id);
      // Se apagou o livro que estava aberto na edição, fecha a janela.
      if (modal?.livro?.id === livro.id) setModal(null);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  // Filtro da busca: procura no título, autor e ISBN (sem diferenciar maiúsculas).
  const termo = busca.trim().toLowerCase();
  const resultadoBusca = livros.filter((l) =>
    [l.titulo, l.autor, l.isbn ?? ""].some((campo) => campo.toLowerCase().includes(termo))
  );

  // Filtro do catálogo por disponibilidade.
  const doCatalogo = livros.filter((l) =>
    filtro === "todos" ? true : filtro === "disponiveis" ? l.disponivel : !l.disponivel
  );

  // Prateleiras da aba Início.
  const recentes = [...livros].sort((a, b) => b.id - a.id).slice(0, 6);
  const disponiveis = livros.filter((l) => l.disponivel).slice(0, 6);

  // Props comuns a todas as grades.
  // "podeGerenciar" só controla o que aparece na tela; quem bloqueia
  // de verdade é o backend (403 para usuário comum).
  const acoesGrade = {
    podeGerenciar: usuario?.papel === "admin",
    aoAbrir: (livro) => setDetalheId(livro.id), // CORRIGIDO: antes não existia
    aoEditar: (livro) => setModal({ livro }),
    aoAlternar: alternarDisponibilidade,
    aoApagar: remover,
  };

  if (carregandoSessao) {
    return (
      <main className="tela-login">
        <p className="vazio">Verificando sessão...</p>
      </main>
    );
  }

  if (!usuario) return <Login aoEntrar={entrar} aviso={erro} />;

  return (
    <div className="app">
      {/* ===== Menu lateral ===== */}
      <aside className="lateral">
        <div className="logo">
          Biblioteca<span>de Livros</span>
        </div>
        <nav>
          {ABAS.map((item) => (
            <button
              key={item.id}
              className={`aba ${aba === item.id ? "ativa" : ""}`}
              onClick={() => setAba(item.id)}
            >
              <span>{item.icone}</span> {item.rotulo}
            </button>
          ))}
        </nav>
      </aside>

      {/* ===== Conteúdo ===== */}
      <main className="conteudo">
        <div className="topo">
          <h1>{ABAS.find((a) => a.id === aba).rotulo}</h1>
          <div className="acoes-usuario">
            <span>{usuario.username}</span>
            {usuario.papel === "admin" && (
              <button className="botao-primario" onClick={() => setModal({ livro: null })}>
                + Novo livro
              </button>
            )}
            <button className="botao-secundario" onClick={sair}>
              Sair
            </button>
          </div>
        </div>

        {erro && <p className="erro">{erro}</p>}

        {carregando ? (
          <p className="vazio">Carregando...</p>
        ) : (
          <>
            {aba === "inicio" && (
              <>
                <h2 className="secao">Adicionados recentemente</h2>
                <Grade
                  {...acoesGrade}
                  lista={recentes}
                  vazio={
                    usuario.papel === "admin"
                      ? "Nenhum livro cadastrado ainda. Clique em “+ Novo livro”."
                      : "Nenhum livro cadastrado ainda."
                  }
                />
                {disponiveis.length > 0 && (
                  <>
                    <h2 className="secao">Disponíveis agora</h2>
                    <Grade {...acoesGrade} lista={disponiveis} vazio="" />
                  </>
                )}
              </>
            )}

            {aba === "pesquisar" && (
              <>
                <input
                  className="busca"
                  placeholder="Buscar por título, autor ou ISBN..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  autoFocus
                />
                <Grade {...acoesGrade} lista={resultadoBusca} vazio="Nenhum livro encontrado." />
              </>
            )}

            {aba === "catalogo" && (
              <>
                <div className="filtros">
                  {[
                    ["todos", "Todos"],
                    ["disponiveis", "Disponíveis"],
                    ["emprestados", "Emprestados"],
                  ].map(([id, rotulo]) => (
                    <button
                      key={id}
                      className={`filtro ${filtro === id ? "ativo" : ""}`}
                      onClick={() => setFiltro(id)}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
                <Grade {...acoesGrade} lista={doCatalogo} vazio="Nenhum livro nesta categoria." />
              </>
            )}
          </>
        )}
      </main>

      {/* Janela de cadastro/edição (só admin chega aqui, pois só ele vê os botões).
          "key" força recriar o formulário ao trocar de livro. */}
      {modal && (
        <ModalLivro
          key={modal.livro?.id ?? "novo"}
          livro={modal.livro}
          aoFechar={() => setModal(null)}
          aoSalvar={salvarLivro}
        />
      )}

      {/* NOVO: janela de detalhe (capa ampliada + sinopse). Qualquer usuário vê. */}
      {livroDetalhe && (
        <DetalheLivro livro={livroDetalhe} aoFechar={() => setDetalheId(null)} />
      )}
    </div>
  );
}