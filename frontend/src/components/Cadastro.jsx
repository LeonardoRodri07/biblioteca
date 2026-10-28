import { useState } from "react";

// Tela "Criar conta".
// aoCadastrar: função do App que chama a API e já deixa a pessoa logada.
// aoIrParaLogin: volta para a tela de entrar.
export default function Cadastro({ aoCadastrar, aoIrParaLogin }) {
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [souBibliotecario, setSouBibliotecario] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    setErro("");

    // Conferência que não precisa ir até a API.
    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setEnviando(true);
    try {
      await aoCadastrar({
        username: username.trim(),
        senha,
        // Só envia o código se a pessoa marcou a opção e digitou algo.
        codigo_bibliotecario: souBibliotecario && codigo ? codigo : null,
      });
    } catch (e) {
      setErro(e.message || "Não foi possível criar a conta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="tela-login">
      <form className="cartao-login" onSubmit={enviar}>
        <div className="logo-login">Biblioteca<span>de Livros</span></div>
        <h1>Criar conta</h1>
        <p>Preencha os dados para acessar a biblioteca.</p>

        {erro && <p className="erro" role="alert">{erro}</p>}

        <label>
          Usuário
          <input
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            maxLength={50}
            pattern="[A-Za-z0-9_.\-]+"
            title="Use letras, números, ponto, hífen ou sublinhado (mínimo 3)."
            required
          />
        </label>
        <label>
          Senha (mínimo 8 caracteres)
          <input
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            minLength={8}
            maxLength={72}
            required
          />
        </label>
        <label>
          Confirmar senha
          <input
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
          />
        </label>

        <label className="marcar-linha">
          <input
            type="checkbox"
            checked={souBibliotecario}
            onChange={(e) => setSouBibliotecario(e.target.checked)}
          />
          Sou bibliotecário
        </label>

        {souBibliotecario && (
          <label>
            Código de bibliotecário
            <input
              type="password"
              autoComplete="off"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
            />
          </label>
        )}

        <button className="botao-primario" type="submit" disabled={enviando}>
          {enviando ? "Criando..." : "Criar conta"}
        </button>

        <button type="button" className="link-botao" onClick={aoIrParaLogin}>
          Já tenho conta. Entrar
        </button>
      </form>
    </main>
  );
}
