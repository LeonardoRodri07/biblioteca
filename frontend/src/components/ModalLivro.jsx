import { useEffect, useState } from "react";
import { urlCapa } from "../api";

// Mesmas regras do backend: assim avisamos o erro antes de enviar.
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 2 * 1024 * 1024; // 2 MB

// Janela de cadastro/edição.
// livro: o livro sendo editado, ou null para cadastrar um novo.
// aoSalvar: função assíncrona do App que conversa com a API.
export default function ModalLivro({ livro, categorias = [], aoFechar, aoSalvar }) {
  const editando = Boolean(livro);

  // O formulário já começa preenchido quando estamos editando.
  // "?? ''" troca null por texto vazio (input não aceita null).
  const [form, setForm] = useState({
    titulo: livro?.titulo ?? "",
    autor: livro?.autor ?? "",
    ano_publicacao: livro?.ano_publicacao ?? "",
    isbn: livro?.isbn ?? "",
    sinopse: livro?.sinopse ?? "",
    categoria: livro?.categoria ?? "",
  });
  const [arquivo, setArquivo] = useState(null);     // foto escolhida agora
  const [previa, setPrevia] = useState(null);       // endereço temporário da prévia
  const [tirarCapa, setTirarCapa] = useState(false); // marcou "remover capa atual"
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Libera a URL temporária da prévia quando ela muda ou o modal fecha.
  useEffect(() => {
    if (!previa) return;
    return () => URL.revokeObjectURL(previa);
  }, [previa]);

  // Tecla Esc fecha a janela.
  useEffect(() => {
    function aoApertar(evento) {
      if (evento.key === "Escape") aoFechar();
    }
    window.addEventListener("keydown", aoApertar);
    return () => window.removeEventListener("keydown", aoApertar);
  }, [aoFechar]);

  function aoDigitar(evento) {
    setForm({ ...form, [evento.target.name]: evento.target.value });
  }

  // Valida a foto escolhida antes de aceitar.
  function aoEscolherFoto(evento) {
    const escolhido = evento.target.files[0];
    if (!escolhido) return;
    if (!TIPOS_ACEITOS.includes(escolhido.type)) {
      setErro("Formato não suportado. Use JPG, PNG ou WEBP.");
      evento.target.value = "";
      return;
    }
    if (escolhido.size > TAMANHO_MAXIMO) {
      setErro("A imagem passa de 2 MB.");
      evento.target.value = "";
      return;
    }
    setErro("");
    setPrevia(URL.createObjectURL(escolhido));
    setArquivo(escolhido);
    setTirarCapa(false);
  }

  async function aoEnviar(evento) {
    evento.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await aoSalvar({
        dados: {
          titulo: form.titulo.trim(),
          autor: form.autor.trim(),
          // Campo opcional vazio vira null (limpa o valor no banco).
          ano_publicacao: form.ano_publicacao ? Number(form.ano_publicacao) : null,
          isbn: form.isbn.trim() ? form.isbn.trim() : null,
          sinopse: form.sinopse.trim() ? form.sinopse.trim() : null,
          categoria: form.categoria.trim() ? form.categoria.trim() : null,
        },
        arquivo,
        tirarCapa,
      });
      aoFechar();
    } catch (e) {
      setErro(e.message); // ex.: "Já existe um livro com esse ISBN"
    } finally {
      setSalvando(false);
    }
  }

  // Qual imagem mostrar na prévia: a nova, ou a atual (se não for removida).
  const imagemMostrada =
    (arquivo ? previa : null) || (!tirarCapa ? urlCapa(livro?.capa) : null);

  return (
    // Clicar no fundo escuro fecha a janela.
    <div className="fundo-modal" onMouseDown={aoFechar}>
      {/* stopPropagation: clicar dentro da janela não deve fechá-la. */}
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2>{editando ? "Editar livro" : "Novo livro"}</h2>

        {erro && <p className="erro">{erro}</p>}

        <form onSubmit={aoEnviar} className="modal-form">
          <div className="modal-capa">
            <div className="capa">
              {imagemMostrada ? (
                <img src={imagemMostrada} alt="Prévia da capa" />
              ) : (
                <div className="capa-vazia"><span>Sem capa</span></div>
              )}
            </div>
            <label className="botao-arquivo">
              📷 Escolher foto
              <input type="file" accept="image/jpeg,image/png,image/webp"
                     onChange={aoEscolherFoto} hidden />
            </label>
            {/* Só aparece ao editar um livro que já tem capa e sem foto nova. */}
            {editando && livro.capa && !arquivo && (
              <label className="marcar">
                <input type="checkbox" checked={tirarCapa}
                       onChange={(e) => setTirarCapa(e.target.checked)} />
                Remover capa atual
              </label>
            )}
          </div>

          <div className="campos">
            <label>Título *
              <input name="titulo" value={form.titulo} onChange={aoDigitar}
                     maxLength={200} required autoFocus />
            </label>
            <label>Autor *
              <input name="autor" value={form.autor} onChange={aoDigitar}
                     maxLength={120} required />
            </label>
            <label>Categoria
              <input name="categoria" list="lista-categorias" value={form.categoria}
                     onChange={aoDigitar} maxLength={60}
                     placeholder="Ex.: Romance (escolha ou digite uma nova)" />
              <datalist id="lista-categorias">
                {categorias.map((nome) => <option key={nome} value={nome} />)}
              </datalist>
            </label>
            <div className="linha">
              <label>Ano
                <input name="ano_publicacao" type="number" min="1000" max="2100"
                       value={form.ano_publicacao} onChange={aoDigitar} />
              </label>
              <label>ISBN
                <input name="isbn" value={form.isbn} onChange={aoDigitar}
                       maxLength={20} />
              </label>
            </div>
            <label>Sinopse
              <textarea name="sinopse" rows={5} maxLength={5000}
                        value={form.sinopse} onChange={aoDigitar} />
            </label>
          </div>

          <div className="modal-acoes">
            <button type="button" className="botao-secundario" onClick={aoFechar}>
              Cancelar
            </button>
            <button type="submit" className="botao-primario" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}