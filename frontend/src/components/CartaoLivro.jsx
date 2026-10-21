import { useEffect, useRef, useState } from "react";
import { urlCapa } from "../api";

// Um livro na grade: capa, etiqueta, menu "..." e textos.
// Os botões do menu chamam funções que vêm de fora (props).
export default function CartaoLivro({
  livro,
  aoAbrir,
  podeGerenciar,
  aoEditar,
  aoAlternar,
  aoApagar,
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const refMenu = useRef(null); // referência ao menu, para detectar cliques fora

  // Fecha o menu ao clicar em qualquer lugar fora dele.
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

  // Executa a ação escolhida e fecha o menu.
  function acionar(funcao) {
    setMenuAberto(false);
    funcao(livro);
  }

  const capa = urlCapa(livro.capa);

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
          // Sem foto: mostra um bloco colorido com o título.
          <div className="capa-vazia">
            <span>{livro.titulo}</span>
          </div>
        )}
      </div>

      <div className="cartao-rodape">
        <span className={`etiqueta ${livro.disponivel ? "verde" : "laranja"}`}>
          {livro.disponivel ? "Disponível" : "Emprestado"}
        </span>

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
                <li><button onClick={() => acionar(aoEditar)}>✏️ Editar</button></li>
                <li>
                  <button onClick={() => acionar(aoAlternar)}>
                    {livro.disponivel ? "📤 Marcar como emprestado" : "📥 Marcar como disponível"}
                  </button>
                </li>
                <li>
                  <button className="perigo" onClick={() => acionar(aoApagar)}>
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
    </article>
  );
}