import { useEffect, useState } from "react";
import {
  apagarCapa,
  apagarLivro,
  atualizarLivro,
  criarLivro,
  enviarCapa,
  listarLivros,
} from "./api";
import CartaoLivro from "./components/CartaoLivro";
import ModalLivro from "./components/ModalLivro";
import "./App.css";

// Abas do menu lateral.
const ABAS = [
  { id: "inicio", rotulo: "Início", icone: "🏠" },
  { id: "pesquisar", rotulo: "Pesquisar", icone: "🔍" },
  { id: "catalogo", rotulo: "Catálogo", icone: "📖" },
];

export default function App() {
  const [livros, setLivros] = useState([]);
  const [aba, setAba] = useState("inicio");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos"); // todos | disponiveis | emprestados
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  // Controla a janela: null = fechada; { livro: null } = novo; { livro } = edição.
  const [modal, setModal] = useState(null);

  async function carregar() {
    try {
      setLivros(await listarLivros());
      setErro("");
    } catch (e) {
      setErro("Não foi possível carregar os livros. A API está rodando?");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

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

  // Desenha uma grade de cartões (ou uma mensagem se estiver vazia).
  function Grade({ lista, vazio }) {
    if (lista.length === 0) return <p className="vazio">{vazio}</p>;
    return (
      <div className="grade">
        {lista.map((livro) => (
          <CartaoLivro
            key={livro.id}
            livro={livro}
            aoEditar={(l) => setModal({ livro: l })}
            aoAlternar={alternarDisponibilidade}
            aoApagar={remover}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="app">
      {/* ===== Menu lateral ===== */}
      <aside className="lateral">
        <div className="logo">Biblioteca<span>de Livros</span></div>
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
          <button className="botao-primario" onClick={() => setModal({ livro: null })}>
            + Novo livro
          </button>
        </div>

        {erro && <p className="erro">{erro}</p>}

        {carregando ? (
          <p className="vazio">Carregando...</p>
        ) : (
          <>
            {aba === "inicio" && (
              <>
                <h2 className="secao">Adicionados recentemente</h2>
                <Grade lista={recentes} vazio="Nenhum livro cadastrado ainda. Clique em “+ Novo livro”." />
                {disponiveis.length > 0 && (
                  <>
                    <h2 className="secao">Disponíveis agora</h2>
                    <Grade lista={disponiveis} vazio="" />
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
                <Grade lista={resultadoBusca} vazio="Nenhum livro encontrado." />
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
                <Grade lista={doCatalogo} vazio="Nenhum livro nesta categoria." />
              </>
            )}
          </>
        )}
      </main>

      {/* A janela só existe enquanto "modal" não for null.
          "key" força recriar o formulário ao trocar de livro. */}
      {modal && (
        <ModalLivro
          key={modal.livro?.id ?? "novo"}
          livro={modal.livro}
          aoFechar={() => setModal(null)}
          aoSalvar={salvarLivro}
        />
      )}
    </div>
  );
}