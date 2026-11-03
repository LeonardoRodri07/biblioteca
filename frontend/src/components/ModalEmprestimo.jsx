import { useEffect, useState } from "react";
import { listarUsuarios } from "../api";
import { hojeMaisDias } from "../utils";

// Janela "Emprestar": escolhe a conta e o vencimento.
// aoConfirmar: função assíncrona do App; se lançar erro, ele aparece aqui.
export default function ModalEmprestimo({ livro, aoFechar, aoConfirmar }) {
  const [usuarios, setUsuarios] = useState(null); // null = carregando
  const [usuarioId, setUsuarioId] = useState("");
  const [vencimento, setVencimento] = useState(hojeMaisDias(14)); // prazo padrão
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Busca as contas ao abrir. Só as ativas podem pegar livros.
  useEffect(() => {
    let ativo = true;
    listarUsuarios()
      .then((lista) => {
        if (!ativo) return;
        setUsuarios(
          lista.filter((u) => u.ativo).sort((a, b) => a.username.localeCompare(b.username))
        );
      })
      .catch((e) => {
        if (!ativo) return;
        setErro(`Não foi possível carregar os usuários: ${e.message}`);
        setUsuarios([]);
      });
    return () => {
      ativo = false;
    };
  }, []);

  // Tecla Esc fecha a janela.
  useEffect(() => {
    function aoApertar(evento) {
      if (evento.key === "Escape") aoFechar();
    }
    window.addEventListener("keydown", aoApertar);
    return () => window.removeEventListener("keydown", aoApertar);
  }, [aoFechar]);

  async function enviar(evento) {
    evento.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await aoConfirmar({
        livro_id: livro.id,
        usuario_id: Number(usuarioId),
        // Sem data = a API usa o prazo padrão de 14 dias.
        data_vencimento: vencimento || null,
      });
      aoFechar();
    } catch (e) {
      setErro(e.message); // ex.: "Este livro não está disponível para empréstimo"
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fundo-modal" onMouseDown={aoFechar}>
      <div
        className="modal estreito"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2>Emprestar livro</h2>
        <p className="dica">“{livro.titulo}”, de {livro.autor}</p>

        {erro && <p className="erro">{erro}</p>}

        <form className="modal-simples" onSubmit={enviar}>
          <label>
            Quem está levando o livro? *
            <select
              value={usuarioId}
              onChange={(e) => setUsuarioId(e.target.value)}
              required
              disabled={usuarios === null}
            >
              <option value="">
                {usuarios === null ? "Carregando..." : "Selecione uma conta..."}
              </option>
              {(usuarios ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                  {u.papel === "admin" ? " (bibliotecário)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            Vencimento *
            <input
              type="date"
              value={vencimento}
              min={hojeMaisDias(1)}
              max={hojeMaisDias(90)}
              onChange={(e) => setVencimento(e.target.value)}
              required
            />
            <span className="dica">Prazo padrão: 14 dias. Máximo: 90 dias.</span>
          </label>

          <div className="modal-acoes">
            <button type="button" className="botao-secundario" onClick={aoFechar}>
              Cancelar
            </button>
            <button type="submit" className="botao-primario" disabled={salvando || !usuarioId}>
              {salvando ? "Registrando..." : "Registrar empréstimo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}