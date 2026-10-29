import { useEffect } from "react";
import { urlCapa } from "../api";

// Janela que mostra o livro ampliado, com todos os dados e a sinopse.
export default function DetalheLivro({ livro, aoFechar }) {
  // Tecla Esc fecha a janela.
  useEffect(() => {
    function aoApertar(evento) {
      if (evento.key === "Escape") aoFechar();
    }
    window.addEventListener("keydown", aoApertar);
    return () => window.removeEventListener("keydown", aoApertar);
  }, [aoFechar]);

  const capa = urlCapa(livro.capa);

  return (
    // Clicar no fundo escuro fecha a janela.
    <div className="fundo-modal" onMouseDown={aoFechar}>
      {/* stopPropagation: clicar dentro da janela não deve fechá-la. */}
      <div
        className="modal detalhe"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes de ${livro.titulo}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="detalhe-fechar" onClick={aoFechar} aria-label="Fechar">
          ✕
        </button>

        <div className="capa detalhe-capa">
          {capa ? (
            <img src={capa} alt={`Capa de ${livro.titulo}`} />
          ) : (
            <div className="capa-vazia"><span>{livro.titulo}</span></div>
          )}
        </div>

        <div className="detalhe-info">
          <span className={`etiqueta ${livro.disponivel ? "verde" : "laranja"}`}>
            {livro.disponivel ? "Disponível" : "Emprestado"}
          </span>
          <h2>{livro.titulo}</h2>
          <p className="detalhe-autor">{livro.autor}</p>
          <p className="detalhe-meta">
            {livro.categoria && <span className="categoria-tag">{livro.categoria}</span>}
            {livro.ano_publicacao ? `Ano: ${livro.ano_publicacao}` : ""}
            {livro.ano_publicacao && livro.isbn ? " · " : ""}
            {livro.isbn ? `ISBN: ${livro.isbn}` : ""}
          </p>

          <h3>Sinopse</h3>
          {livro.sinopse ? (
            // pre-wrap preserva as quebras de linha digitadas.
            <p className="sinopse">{livro.sinopse}</p>
          ) : (
            <p className="vazio">Este livro ainda não tem sinopse.</p>
          )}
        </div>
      </div>
    </div>
  );
}