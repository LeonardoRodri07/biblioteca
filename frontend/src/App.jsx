import { useEffect, useState } from "react";
import { apagarLivro, atualizarLivro, criarLivro, listarLivros } from "./api";
import "./App.css";

// Estado inicial do formulário (campos vazios).
const FORMULARIO_VAZIO = { titulo: "", autor: "", ano_publicacao: "", isbn: "" };

export default function App() {
  // useState guarda dados que, ao mudarem, redesenham a tela.
  const [livros, setLivros] = useState([]);
  const [form, setForm] = useState(FORMULARIO_VAZIO);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  // Busca a lista na API e guarda no estado.
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

  // useEffect com [] roda uma vez, quando a tela aparece pela primeira vez.
  useEffect(() => {
    carregar();
  }, []);

  // Atualiza um campo do formulário conforme a pessoa digita.
  function aoDigitar(evento) {
    setForm({ ...form, [evento.target.name]: evento.target.value });
  }

  // Envia o formulário para a API.
  async function aoEnviar(evento) {
    evento.preventDefault(); // impede o navegador de recarregar a página
    try {
      // Monta o objeto; campos opcionais vazios viram "não enviar".
      const novo = { titulo: form.titulo, autor: form.autor };
      if (form.ano_publicacao) novo.ano_publicacao = Number(form.ano_publicacao);
      if (form.isbn) novo.isbn = form.isbn;

      await criarLivro(novo);
      setForm(FORMULARIO_VAZIO);
      await carregar(); // recarrega a lista
    } catch (e) {
      setErro(e.message); // mostra o erro vindo da API (ex.: ISBN duplicado)
    }
  }

  // Alterna entre disponível e emprestado.
  async function alternarDisponibilidade(livro) {
    try {
      await atualizarLivro(livro.id, { disponivel: !livro.disponivel });
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  // Apaga, com confirmação.
  async function remover(livro) {
    if (!window.confirm(`Apagar "${livro.titulo}"?`)) return;
    try {
      await apagarLivro(livro.id);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <main className="container">
      <h1>📚 Biblioteca de Livros</h1>

      {/* Mensagem de erro, só aparece se houver erro. */}
      {erro && <p className="erro">{erro}</p>}

      <form onSubmit={aoEnviar} className="formulario">
        <input name="titulo" placeholder="Título *" value={form.titulo}
               onChange={aoDigitar} required />
        <input name="autor" placeholder="Autor *" value={form.autor}
               onChange={aoDigitar} required />
        <input name="ano_publicacao" type="number" placeholder="Ano"
               value={form.ano_publicacao} onChange={aoDigitar} />
        <input name="isbn" placeholder="ISBN" value={form.isbn}
               onChange={aoDigitar} />
        <button type="submit">Adicionar</button>
      </form>

      {carregando ? (
        <p>Carregando...</p>
      ) : livros.length === 0 ? (
        <p>Nenhum livro cadastrado ainda.</p>
      ) : (
        <ul className="lista">
          {/* map: transforma cada livro da lista em um item na tela. */}
          {livros.map((livro) => (
            <li key={livro.id} className="item">
              <div>
                <strong>{livro.titulo}</strong>
                <span>
                  {livro.autor}
                  {livro.ano_publicacao ? ` · ${livro.ano_publicacao}` : ""}
                </span>
              </div>
              <div className="acoes">
                <button
                  className={livro.disponivel ? "ok" : "emprestado"}
                  onClick={() => alternarDisponibilidade(livro)}
                >
                  {livro.disponivel ? "Disponível" : "Emprestado"}
                </button>
                <button className="apagar" onClick={() => remover(livro)}>
                  Apagar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}