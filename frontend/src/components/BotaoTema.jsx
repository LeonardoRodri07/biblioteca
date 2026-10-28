import { useEffect, useState } from "react";

const CHAVE = "biblioteca_tema";

// Decide o tema ao abrir: o que a pessoa escolheu antes, ou o do sistema.
function temaInicial() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === "claro" || salvo === "escuro") return salvo;
  } catch {
    // localStorage bloqueado (modo privado, por exemplo): segue o sistema.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
}

// Botão flutuante que alterna entre tema claro e escuro.
export default function BotaoTema() {
  const [tema, setTema] = useState(temaInicial);

  // Aplica o tema no <html>: o CSS reage ao atributo data-tema.
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  function alternar() {
    const novo = tema === "escuro" ? "claro" : "escuro";
    setTema(novo);
    try {
      localStorage.setItem(CHAVE, novo); // só guarda quando a pessoa escolhe
    } catch {
      // sem problema: o tema vale até fechar a página
    }
  }

  const paraEscuro = tema === "claro";
  return (
    <button
      type="button"
      className="botao-tema"
      onClick={alternar}
      aria-label={paraEscuro ? "Ativar modo escuro" : "Ativar modo claro"}
      title={paraEscuro ? "Modo escuro" : "Modo claro"}
    >
      {paraEscuro ? "🌙" : "☀️"}
    </button>
  );
}