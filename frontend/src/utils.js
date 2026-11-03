// Funções de apoio para datas e vencimentos.

// "2026-11-20" -> "20/11/2026". Quebramos o texto na mão, sem usar Date,
// para o fuso horário não "empurrar" o dia para trás ou para frente.
export function formatarData(iso) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Date -> "2026-11-20" (formato do <input type="date"> e da API).
export function dataParaISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Data de hoje + N dias, em "AAAA-MM-DD".
export function hojeMaisDias(dias) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return dataParaISO(data);
}

export const plural = (n, singular, varios) => (n === 1 ? singular : varios);

// Texto e cor da etiqueta de vencimento de um empréstimo.
// "tom" é: "vermelho" (atrasado), "laranja" (em andamento) ou "neutro" (devolvido).
export function rotuloVencimento(emprestimo) {
  if (emprestimo.data_devolucao) {
    return { texto: `Devolvido em ${formatarData(emprestimo.data_devolucao)}`, tom: "neutro" };
  }
  const dias = emprestimo.dias_restantes;
  if (dias < 0) {
    return { texto: `Atrasado há ${-dias} ${plural(-dias, "dia", "dias")}`, tom: "vermelho" };
  }
  if (dias === 0) return { texto: "Vence hoje", tom: "laranja" };
  if (dias === 1) return { texto: "Vence amanhã", tom: "laranja" };
  return { texto: `Vence em ${dias} dias`, tom: "laranja" };
}

// Classe CSS da etiqueta, conforme o tom.
export const classeTom = (tom) =>
  tom === "vermelho" ? "vermelho" : tom === "neutro" ? "neutra" : "laranja";