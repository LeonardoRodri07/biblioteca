import { useEffect, useRef, useState } from "react";
import { urlCapa } from "../api";
import { classeTom, rotuloVencimento } from "../utils";

// Um livro na grade: capa, etiqueta, menu "..." e textos.
// emprestimo: o empréstimo em andamento que ESTA pessoa pode ver (ou undefined).
export default function CartaoLivro({
  livro,
  emprestimo,
  podeGerenciar,
  aoAbrir,
  aoEditar,
  aoAlternar,
  aoEmprestar,
  aoDevolver,
  aoApagar,
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const refMenu = useRef(null);

  // Fecha o menu ao clicar fora dele.
  useEffect(() => {
    if (!menuAberto) return;
    function clicouFora(evento) {
      if (refMenu.current && !refMenu.current.contains(evento.target)) {
        setMenuAberto(false);
      }
    }
    document.addEventListener("mousedown", clicouFora);
    return () => document.removeEventListener("mousedown", clicouFora);
  }, [menuAberto]);

  // Fecha o menu e executa a ação escolhida.
  function acionar(acao) {
    setMenuAberto(false);
    acao();
  }

  const capa = urlCapa(livro.capa);

  // Texto e cor da etiqueta.
  let rotulo = "Disponível";
  let classe = "verde";
  if (!livro.disponivel) {
    if (emprestimo) {
      const r = rotuloVencimento(emprestimo);
      rotulo = r.texto;
      classe = classeTom(r.tom);
    } else {
      rotulo = "Emprestado";
      classe = "laranja";
    }
  }

  return (
    <article className="cartao">
      <div
        className="capa clicavel"
        role="button"
        tabIndex={0}
        onClick={() => aoAbrir(livro)}
        onKeyDown={(e) => e.key === "Enter" && aoAbrir(livro)}
      >
        {capa ? (
          <img src={capa} alt={`Capa de ${livro.titulo}`} loading="lazy" />
        ) : (
          <div className="capa-vazia">
            <span>{livro.titulo}</span>
          </div>
        )}
      </div>

      <div className="cartao-rodape">
        <span className={`etiqueta ${classe}`}>{rotulo}</span>

        {podeGerenciar && (
          <div className="menu" ref={refMenu}>
            <button
              className="menu-botao"
              aria-label={`Opções de ${livro.titulo}`}
              onClick={() => setMenuAberto(!menuAberto)}
            >
              •••
            </button>
            {menuAberto && (
              <ul className="menu-lista">
                <li>
                  <button onClick={() => acionar(() => aoEditar(livro))}>✏️ Editar</button>
                </li>

                {/* Disponível: dá para emprestar. */}
                {livro.disponivel && (
                  <li>
                    <button onClick={() => acionar(() => aoEmprestar(livro))}>
                      📤 Emprestar
                    </button>
                  </li>
                )}

                {/* Emprestado de verdade: registrar a devolução. */}
                {!livro.disponivel && emprestimo && (
                  <li>
                    <button onClick={() => acionar(() => aoDevolver(emprestimo))}>
                      📥 Registrar devolução
                    </button>
                  </li>
                )}

                {/* Marcado "emprestado" à mão, sem registro (livros antigos). */}
                {!livro.disponivel && !emprestimo && (
                  <li>
                    <button onClick={() => acionar(() => aoAlternar(livro))}>
                      📥 Marcar como disponível
                    </button>
                  </li>
                )}

                <li>
                  <button className="perigo" onClick={() => acionar(() => aoApagar(livro))}>
                    🗑️ Apagar
                  </button>
                </li>
              </ul>
            )}
          </div>
        )}
      </div>

      <h3 className="clicavel" onClick={() => aoAbrir(livro)}>{livro.titulo}</h3>
      <p>
        {livro.autor}
        {livro.ano_publicacao ? ` · ${livro.ano_publicacao}` : ""}
      </p>
      {livro.categoria && <span className="categoria-tag">{livro.categoria}</span>}

      {/* Só o bibliotecário vê com quem o livro está. */}
      {podeGerenciar && emprestimo && (
        <p className="emprestado-com">👤 {emprestimo.usuario_username}</p>
      )}
    </article>
  );
}