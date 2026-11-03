import { useCallback, useEffect, useState } from "react";
import {
  apagarCapa,
  apagarLivro,
  atualizarLivro,
  criarLivro,
  devolverEmprestimo,
  entrar as autenticar,
  enviarCapa,
  listarEmprestimos,
  listarLivros,
  meusEmprestimos,
  obterToken,
  registrar,
  registrarEmprestimo,
  removerToken,
  renovarEmprestimo,
  salvarToken,
  usuarioAtual,
} from "./api";
import Cadastro from "./components/Cadastro";
import CartaoLivro from "./components/CartaoLivro";
import DetalheLivro from "./components/DetalheLivro";
import Login from "./components/Login";
import ModalEmprestimo from "./components/ModalEmprestimo";
import ModalLivro from "./components/ModalLivro";
import PainelEmprestimos from "./components/PainelEmprestimos";
import { plural } from "./utils";
import "./App.css";

// Abas fixas do menu lateral. A aba de empréstimos é montada dentro do App,
// porque o nome muda conforme o perfil.
const ABAS_BASE = [
  { id: "inicio", rotulo: "Início", icone: "🏠" },
  { id: "pesquisar", rotulo: "Pesquisar", icone: "🔍" },
  { id: "catalogo", rotulo: "Catálogo", icone: "📖" },
];

// Valor especial do filtro: livros que ainda não têm categoria.
const SEM_CATEGORIA = "__sem__";

// Grade de cartões. Fica FORA do App para não ser recriada a cada
// renderização (o que faria a busca perder o foco).
function Grade({ lista, vazio, ativoPorLivro, ...acoes }) {
  if (lista.length === 0) return <p className="vazio">{vazio}</p>;
  return (
    <div className="grade">
      {lista.map((livro) => (
        <CartaoLivro
          key={livro.id}
          livro={livro}
          emprestimo={ativoPorLivro.get(livro.id)}
          {...acoes}
        />
      ))}
    </div>
  );
}

export default function App() {
  const [livros, setLivros] = useState([]);
  const [emprestimos, setEmprestimos] = useState([]);
  const [aba, setAba] = useState("inicio");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos"); // todos | disponiveis | emprestados
  const [categoriaFiltro, setCategoriaFiltro] = useState(""); // "" = todas
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [usuario, setUsuario] = useState(null);
  const [ocupado, setOcupado] = useState(false); // uma ação (renovar/devolver...) em andamento

  // Qual tela mostrar quando não há ninguém logado: "login" ou "cadastro".
  const [telaPublica, setTelaPublica] = useState("login");

  // Detalhe: guardamos só o id; a janela sempre mostra o livro atualizado.
  const [detalheId, setDetalheId] = useState(null);
  const livroDetalhe = livros.find((l) => l.id === detalheId);

  // Janelas: cadastro/edição ({ livro: null } = novo) e emprestar (o livro escolhido).
  const [modal, setModal] = useState(null);
  const [livroEmprestar, setLivroEmprestar] = useState(null);

  // Carrega livros e empréstimos juntos.
  // Bibliotecário recebe todos os empréstimos; usuário comum, só os próprios.
  const carregar = useCallback(async (papel) => {
    try {
      const [listaLivros, listaEmprestimos] = await Promise.all([
        listarLivros(),
        papel === "admin" ? listarEmprestimos() : meusEmprestimos(),
      ]);
      setLivros(listaLivros);
      setEmprestimos(listaEmprestimos);
      setErro("");
    } catch (e) {
      setErro(
        e.status === 401
          ? "Sua sessão expirou. Entre novamente."
          : `Não foi possível carregar os dados: ${e.message}`
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
        await carregar(usuarioLogado.papel);
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
      setEmprestimos([]);
      setModal(null);
      setLivroEmprestar(null);
      setDetalheId(null);
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
    await carregar(resposta.usuario.papel);
  }

  // Cria a conta e já deixa a pessoa logada (a API devolve o token).
  async function cadastrar(dados) {
    const resposta = await registrar(dados);
    salvarToken(resposta.access_token);
    setUsuario(resposta.usuario);
    setErro("");
    setCarregando(true);
    await carregar(resposta.usuario.papel);
  }

  function sair() {
    removerToken();
    setUsuario(null);
    setLivros([]);
    setEmprestimos([]);
    setModal(null);
    setLivroEmprestar(null);
    setDetalheId(null);
    setAba("inicio");
    setErro("");
    setTelaPublica("login");
  }

  // Executa uma ação, recarrega os dados e mostra o erro (se houver).
  // "ocupado" desabilita os botões enquanto espera (evita clique duplo).
  async function executar(acao) {
    setOcupado(true);
    try {
      await acao();
      await carregar(usuario.papel);
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  // Chamada pelo modal de livro ao clicar em "Salvar".
  // Se lançar erro, o próprio modal o mostra e continua aberto.
  async function salvarLivro({ dados, arquivo, tirarCapa }) {
    const salvo = modal.livro
      ? await atualizarLivro(modal.livro.id, dados)
      : await criarLivro(dados);

    if (arquivo) await enviarCapa(salvo.id, arquivo);
    else if (tirarCapa && salvo.capa) await apagarCapa(salvo.id);

    await carregar(usuario.papel);
  }

  // Chamada pelo modal "Emprestar". Erros aparecem dentro dele.
  async function emprestar(dados) {
    await registrarEmprestimo(dados);
    await carregar(usuario.papel);
  }

  const devolver = (emprestimo) => {
    if (!window.confirm(`Registrar a devolução de "${emprestimo.livro_titulo}"?`)) return;
    return executar(() => devolverEmprestimo(emprestimo.id));
  };

  const renovar = (emprestimo) => executar(() => renovarEmprestimo(emprestimo.id));

  // Só usado para livros antigos, marcados "emprestado" à mão (sem registro).
  const alternarDisponibilidade = (livro) =>
    executar(() => atualizarLivro(livro.id, { disponivel: !livro.disponivel }));

  async function remover(livro) {
    if (!window.confirm(`Apagar "${livro.titulo}"?`)) return;
    await executar(async () => {
      await apagarLivro(livro.id);
      if (modal?.livro?.id === livro.id) setModal(null);
    });
  }

  // ===== Dados derivados =====
  const ehAdmin = usuario?.papel === "admin";

  // livro_id -> empréstimo em andamento (só os que esta pessoa pode ver).
  const ativoPorLivro = new Map(
    emprestimos.filter((e) => !e.data_devolucao).map((e) => [e.livro_id, e])
  );
  const atrasados = emprestimos.filter((e) => e.situacao === "atrasado");

  const abas = [
    ...ABAS_BASE,
    { id: "emprestimos", rotulo: ehAdmin ? "Empréstimos" : "Meus empréstimos", icone: "🔖" },
  ];

  // Categorias existentes (sem repetir, em ordem alfabética) e as contagens.
  const categorias = [...new Set(livros.map((l) => l.categoria).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  const totalPorCategoria = (nome) => livros.filter((l) => l.categoria === nome).length;
  const totalSemCategoria = livros.filter((l) => !l.categoria).length;

  // Se a categoria escolhida deixou de existir, volta sozinho para "todas".
  const categoriaAtiva =
    (categoriaFiltro === SEM_CATEGORIA && totalSemCategoria > 0) ||
    categorias.includes(categoriaFiltro)
      ? categoriaFiltro
      : "";

  // Busca: título, autor, ISBN e categoria (sem diferenciar maiúsculas).
  const termo = busca.trim().toLowerCase();
  const resultadoBusca = livros.filter((l) =>
    [l.titulo, l.autor, l.isbn ?? "", l.categoria ?? ""].some((campo) =>
      campo.toLowerCase().includes(termo)
    )
  );

  // Catálogo: disponibilidade E categoria.
  const doCatalogo = livros.filter((l) => {
    const statusOk =
      filtro === "todos" ? true : filtro === "disponiveis" ? l.disponivel : !l.disponivel;
    const categoriaOk =
      categoriaAtiva === ""
        ? true
        : categoriaAtiva === SEM_CATEGORIA
          ? !l.categoria
          : l.categoria === categoriaAtiva;
    return statusOk && categoriaOk;
  });

  // Prateleiras da aba Início.
  const recentes = [...livros].sort((a, b) => b.id - a.id).slice(0, 6);
  const disponiveis = livros.filter((l) => l.disponivel).slice(0, 6);

  // Props comuns a todas as grades.
  // "podeGerenciar" só controla o que aparece na tela; quem bloqueia
  // de verdade é o backend (403 para usuário comum).
  const acoesGrade = {
    ativoPorLivro,
    podeGerenciar: ehAdmin,
    aoAbrir: (livro) => setDetalheId(livro.id),
    aoEditar: (livro) => setModal({ livro }),
    aoAlternar: alternarDisponibilidade,
    aoEmprestar: (livro) => setLivroEmprestar(livro),
    aoDevolver: devolver,
    aoApagar: remover,
  };

  // ===== Telas sem login =====
  if (carregandoSessao) {
    return (
      <main className="tela-login">
        <p className="vazio">Verificando sessão...</p>
      </main>
    );
  }

  if (!usuario) {
    // Ao trocar de tela, limpa mensagens de erro da tela anterior.
    const irPara = (tela) => {
      setErro("");
      setTelaPublica(tela);
    };
    return telaPublica === "cadastro" ? (
      <Cadastro aoCadastrar={cadastrar} aoIrParaLogin={() => irPara("login")} />
    ) : (
      <Login aoEntrar={entrar} aviso={erro} aoIrParaCadastro={() => irPara("cadastro")} />
    );
  }

  // ===== Sistema =====
  return (
    <div className="app">
      {/* ===== Menu lateral ===== */}
      <aside className="lateral">
        <div className="logo">
          Biblioteca<span>de Livros</span>
        </div>
        <nav>
          {abas.map((item) => (
            <button
              key={item.id}
              className={`aba ${aba === item.id ? "ativa" : ""}`}
              onClick={() => setAba(item.id)}
            >
              <span>{item.icone}</span> {item.rotulo}
              {item.id === "emprestimos" && atrasados.length > 0 && (
                <span className="contador" title="Empréstimos atrasados">
                  {atrasados.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* ===== Conteúdo ===== */}
      <main className="conteudo">
        <div className="topo">
          <h1>{abas.find((a) => a.id === aba)?.rotulo}</h1>
          <div className="acoes-usuario">
            <span>{usuario.username}</span>
            {ehAdmin && (
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

        {/* Aviso de atraso em todas as abas, exceto na própria aba de empréstimos. */}
        {aba !== "emprestimos" && atrasados.length > 0 && (
          <div className="aviso-atraso" role="alert">
            <span>
              ⚠️{" "}
              {ehAdmin
                ? `${atrasados.length} ${plural(atrasados.length, "empréstimo atrasado", "empréstimos atrasados")}.`
                : `Você tem ${atrasados.length} ${plural(atrasados.length, "livro atrasado", "livros atrasados")}. Faça a devolução.`}
            </span>
            <button onClick={() => setAba("emprestimos")}>Ver</button>
          </div>
        )}

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
                    ehAdmin
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
                  placeholder="Buscar por título, autor, ISBN ou categoria..."
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
                  <select
                    className="filtro-categoria"
                    value={categoriaAtiva}
                    onChange={(e) => setCategoriaFiltro(e.target.value)}
                    aria-label="Filtrar por categoria"
                  >
                    <option value="">Todas as categorias</option>
                    {categorias.map((nome) => (
                      <option key={nome} value={nome}>
                        {nome} ({totalPorCategoria(nome)})
                      </option>
                    ))}
                    {totalSemCategoria > 0 && (
                      <option value={SEM_CATEGORIA}>Sem categoria ({totalSemCategoria})</option>
                    )}
                  </select>
                </div>
                <Grade
                  {...acoesGrade}
                  lista={doCatalogo}
                  vazio="Nenhum livro com esses filtros."
                />
              </>
            )}

            {aba === "emprestimos" && (
              <PainelEmprestimos
                emprestimos={emprestimos}
                admin={ehAdmin}
                ocupado={ocupado}
                aoRenovar={renovar}
                aoDevolver={devolver}
                aoAbrirLivro={(id) => setDetalheId(id)}
              />
            )}
          </>
        )}
      </main>

      {/* Janela de cadastro/edição. "key" recria o formulário ao trocar de livro. */}
      {modal && (
        <ModalLivro
          key={modal.livro?.id ?? "novo"}
          livro={modal.livro}
          categorias={categorias}
          aoFechar={() => setModal(null)}
          aoSalvar={salvarLivro}
        />
      )}

      {/* Janela "Emprestar" (só o bibliotecário chega aqui). */}
      {livroEmprestar && (
        <ModalEmprestimo
          key={livroEmprestar.id}
          livro={livroEmprestar}
          aoFechar={() => setLivroEmprestar(null)}
          aoConfirmar={emprestar}
        />
      )}

      {/* Janela de detalhe (capa ampliada, empréstimo e sinopse). */}
      {livroDetalhe && (
        <DetalheLivro
          livro={livroDetalhe}
          emprestimo={ativoPorLivro.get(livroDetalhe.id)}
          admin={ehAdmin}
          aoFechar={() => setDetalheId(null)}
        />
      )}
    </div>
  );
}