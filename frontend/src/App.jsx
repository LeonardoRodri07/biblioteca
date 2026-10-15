import { useEffect, useState } from "react";
import { apagarLivro, atualizarLivro, criarLivro, listarLivros } from "./api";
import "./App.css";

// Estado inicial do formulário (campos vazios).
const FORMULARIO_VAZIO = { titulo: "", autor: "", ano_publicacao: "", isbn: "" };

export default function App() {
  const [livros, setLivros] = useState([]);
  const [form, setForm] = useState(FORMULARIO_VAZIO);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  // NOVO: guarda o id do livro que está sendo editado.
  // null = estamos criando um livro novo.
  const [editandoId, setEditandoId] = useState(null);

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

  function aoDigitar(evento) {
    setForm({ ...form, [evento.target.name]: evento.target.value });
  }

  // NOVO: clicou em "Editar". Copia os dados do livro para o formulário.
  function iniciarEdicao(livro) {
    setEditandoId(livro.id);
    setForm({
      titulo: livro.titulo,
      autor: livro.autor,
      // Campos opcionais podem vir como null; o input precisa de texto.
      ano_publicacao: livro.ano_publicacao ?? "",
      isbn: livro.isbn ?? "",
    });
    setErro("");
    window.scrollTo({ top: 0, behavior: "smooth" }); // sobe até o formulário
  }

  // NOVO: desiste da edição e limpa o formulário.
  function cancelarEdicao() {
    setEditandoId(null);
    setForm(FORMULARIO_VAZIO);
    setErro("");
  }

  // Envia o formulário: cria OU atualiza, dependendo de editandoId.
  async function aoEnviar(evento) {
    evento.preventDefault();
    try {
      if (editandoId === null) {
        // ----- CRIAR (igual à Etapa 5) -----
        const novo = { titulo: form.titulo, autor: form.autor };
        if (form.ano_publicacao) novo.ano_publicacao = Number(form.ano_publicacao);
        if (form.isbn) novo.isbn = form.isbn;
        await criarLivro(novo);
      } else {
        // ----- EDITAR -----
        // No PATCH enviamos todos os campos do formulário.
        // Campo opcional apagado vira null, para limpar o valor no banco.
        const mudancas = {
          titulo: form.titulo,
          autor: form.autor,
          ano_publicacao: form.ano_publicacao ? Number(form.ano_publicacao) : null,
          isbn: form.isbn ? form.isbn : null,
        };
        await atualizarLivro(editandoId, mudancas);
      }
      cancelarEdicao(); // limpa o formulário e volta ao modo "criar"
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
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
      // Se apagou o livro que estava sendo editado, sai do modo edição.
      if (editandoId === livro.id) cancelarEdicao();
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <main className="container">
      <h1>📚 Biblioteca de Livros</h1>

      {erro && <p className="erro">{erro}</p>}

      {/* Aviso visual de que estamos no modo edição. */}
      {editandoId !== null && (
        <p className="aviso-edicao">✏️ Editando o livro #{editandoId}</p>
      )}

      <form onSubmit={aoEnviar} className="formulario">
        <input name="titulo" placeholder="Título *" value={form.titulo}
               onChange={aoDigitar} required />
        <input name="autor" placeholder="Autor *" value={form.autor}
               onChange={aoDigitar} required />
        <input name="ano_publicacao" type="number" placeholder="Ano"
               value={form.ano_publicacao} onChange={aoDigitar} />
        <input name="isbn" placeholder="ISBN" value={form.isbn}
               onChange={aoDigitar} />

        {/* O texto do botão muda conforme o modo. */}
        <button type="submit">
          {editandoId === null ? "Adicionar" : "Salvar alterações"}
        </button>

        {/* O botão Cancelar só existe no modo edição. */}
        {editandoId !== null && (
          <button type="button" className="cancelar" onClick={cancelarEdicao}>
            Cancelar
          </button>
        )}
      </form>

      {carregando ? (
        <p>Carregando...</p>
      ) : livros.length === 0 ? (
        <p>Nenhum livro cadastrado ainda.</p>
      ) : (
        <ul className="lista">
          {livros.map((livro) => (
            <li
              key={livro.id}
              // Destaca o item que está sendo editado.
              className={`item ${livro.id === editandoId ? "em-edicao" : ""}`}
            >
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
                {/* NOVO: botão Editar */}
                <button className="editar" onClick={() => iniciarEdicao(livro)}>
                  Editar
                </button>
                <button className="apagar" onClick={() => remover(livro)}>
                  Apagar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <footer className="rodape">
        Biblioteca de Livros · projeto de aprendizado
      </footer>
    </main>
  );
}