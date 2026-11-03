import { useEffect } from "react";
import { urlCapa } from "../api";
import { classeTom, formatarData, plural, rotuloVencimento } from "../utils";

// Janela que mostra o livro ampliado, com os dados, o empréstimo e a sinopse.
// emprestimo: o empréstimo em andamento que ESTA pessoa pode ver (ou undefined).
// admin: true para o bibliotecário (vê quem está com o livro).
export default function DetalheLivro({ livro, emprestimo, admin, aoFechar }) {
  useEffect(() => {
    function aoApertar(evento) {
      if (evento.key === "Escape") aoFechar();
    }
    window.addEventListener("keydown", aoApertar);
    return () => window.removeEventListener("keydown", aoApertar);
  }, [aoFechar]);

  const capa = urlCapa(livro.capa);
  const rotulo = emprestimo ? rotuloVencimento(emprestimo) : null;

  return (
    <div className="fundo-modal" onMouseDown={aoFechar}>
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
            {livro.ano_publicacao ? `Ano: ${livro.ano_publicacao}` : ""}
            {livro.ano_publicacao && livro.isbn ? " · " : ""}
            {livro.isbn ? `ISBN: ${livro.isbn}` : ""}
          </p>
          {livro.categoria && <span className="categoria-tag">{livro.categoria}</span>}

          {emprestimo && (
            <div className="detalhe-emprestimo">
              <h3>Empréstimo</h3>
              <p>
                <strong>
                  {admin ? `Com: ${emprestimo.usuario_username}` : "Você está com este livro"}
                </strong>
              </p>
              <p>
                Emprestado em {formatarData(emprestimo.data_emprestimo)} · vence em{" "}
                {formatarData(emprestimo.data_vencimento)}
              </p>
              <span className={`etiqueta ${classeTom(rotulo.tom)}`}>{rotulo.texto}</span>
              {emprestimo.renovacoes > 0 && (
                <p>
                  Renovado {emprestimo.renovacoes}{" "}
                  {plural(emprestimo.renovacoes, "vez", "vezes")}
                </p>
              )}
            </div>
          )}

          <h3>Sinopse</h3>
          {livro.sinopse ? (
            <p className="sinopse">{livro.sinopse}</p>
          ) : (
            <p className="vazio">Este livro ainda não tem sinopse.</p>
          )}
        </div>
      </div>
    </div>
  );
}