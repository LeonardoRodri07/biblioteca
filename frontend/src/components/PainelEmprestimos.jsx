import { useState } from "react";
import { urlCapa } from "../api";
import { classeTom, formatarData, rotuloVencimento } from "../utils";

// Só para habilitar/desabilitar o botão. Quem decide de verdade é o backend.
const MAX_RENOVACOES = 2;

const FILTROS = [
  { id: "andamento", rotulo: "Em andamento", teste: (e) => !e.data_devolucao },
  { id: "atrasados", rotulo: "Atrasados", teste: (e) => e.situacao === "atrasado" },
  { id: "devolvidos", rotulo: "Devolvidos", teste: (e) => Boolean(e.data_devolucao) },
  { id: "todos", rotulo: "Todos", teste: () => true },
];

// Lista de empréstimos.
// admin = true: mostra a coluna de usuário e os botões Renovar/Devolver.
// admin = false: só consulta (é a tela "Meus empréstimos").
export default function PainelEmprestimos({
  emprestimos,
  admin,
  ocupado,
  aoRenovar,
  aoDevolver,
  aoAbrirLivro,
}) {
  const [filtro, setFiltro] = useState("andamento");
  const [busca, setBusca] = useState("");

  const atual = FILTROS.find((f) => f.id === filtro);
  const termo = busca.trim().toLowerCase();
  const lista = emprestimos
    .filter(atual.teste)
    .filter(
      (e) =>
        !termo ||
        e.livro_titulo.toLowerCase().includes(termo) ||
        e.usuario_username.toLowerCase().includes(termo)
    );

  return (
    <>
      <div className="filtros">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            className={`filtro ${filtro === f.id ? "ativo" : ""}`}
            onClick={() => setFiltro(f.id)}
          >
            {f.rotulo} ({emprestimos.filter(f.teste).length})
          </button>
        ))}
      </div>

      {admin && (
        <input
          className="busca"
          placeholder="Buscar por livro ou usuário..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      )}

      {lista.length === 0 ? (
        <p className="vazio">Nenhum empréstimo nesta lista.</p>
      ) : (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Livro</th>
                {admin && <th>Usuário</th>}
                <th>Emprestado em</th>
                <th>Vencimento</th>
                <th>Situação</th>
                {admin && <th>Renovações</th>}
                {admin && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => {
                const rotulo = rotuloVencimento(e);
                const capa = urlCapa(e.livro_capa);
                const podeRenovar = e.situacao === "ativo" && e.renovacoes < MAX_RENOVACOES;
                return (
                  <tr key={e.id} className={e.situacao === "atrasado" ? "linha-atrasada" : ""}>
                    <td>
                      <div className="livro-celula">
                        <div className="mini-capa">
                          {capa ? (
                            <img src={capa} alt="" loading="lazy" />
                          ) : (
                            <div className="capa-vazia"><span>{e.livro_titulo}</span></div>
                          )}
                        </div>
                        <button className="link-titulo" onClick={() => aoAbrirLivro(e.livro_id)}>
                          {e.livro_titulo}
                        </button>
                      </div>
                    </td>
                    {admin && <td>{e.usuario_username}</td>}
                    <td>{formatarData(e.data_emprestimo)}</td>
                    <td>{formatarData(e.data_vencimento)}</td>
                    <td>
                      <span className={`etiqueta ${classeTom(rotulo.tom)}`}>{rotulo.texto}</span>
                    </td>
                    {admin && <td>{e.renovacoes} / {MAX_RENOVACOES}</td>}
                    {admin && (
                      <td>
                        {!e.data_devolucao && (
                          <div className="acoes-linha">
                            <button
                              className="botao-pequeno"
                              disabled={ocupado || !podeRenovar}
                              title={
                                podeRenovar
                                  ? "Estender o prazo em 14 dias"
                                  : e.situacao === "atrasado"
                                    ? "Atrasado: registre a devolução"
                                    : "Limite de renovações atingido"
                              }
                              onClick={() => aoRenovar(e)}
                            >
                              Renovar
                            </button>
                            <button
                              className="botao-pequeno destaque"
                              disabled={ocupado}
                              onClick={() => aoDevolver(e)}
                            >
                              Devolver
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}