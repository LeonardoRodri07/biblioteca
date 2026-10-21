import { useState } from "react";

export default function Login({ aoEntrar }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    setErro("");
    setEntrando(true);
    try {
      await aoEntrar(username, password);
    } catch (e) {
      setErro(e.message || "Não foi possível entrar.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <main className="tela-login">
      <form className="cartao-login" onSubmit={enviar}>
        <div className="logo-login">Biblioteca<span>de Livros</span></div>
        <h1>Entrar</h1>
        <p>Acesse sua conta para consultar a biblioteca.</p>

        {erro && <p className="erro" role="alert">{erro}</p>}

        <label>
          Usuário
          <input
            autoComplete="username"
            value={username}
            onChange={(evento) => setUsername(evento.target.value)}
            required
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(evento) => setPassword(evento.target.value)}
            required
          />
        </label>
        <button className="botao-primario" type="submit" disabled={entrando}>
          {entrando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
