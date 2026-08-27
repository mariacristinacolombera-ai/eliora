import { useState } from "react";
import { supabase } from "../lib/supabase";
import "./Login.css";
import Logo from "../components/Logo";

type LoginProps = {
  onLogin: () => void;
};

export default function Login({
  onLogin,
}: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setIsLoading(true);
    setMessage("");

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      console.error(error);
      setMessage("Email o password non corretti.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    onLogin();
  }

  return (
  <main className="login-page surface-paper">
    <div className="login-page__content">
      <header className="login-page__header">
        <Logo />

        <p className="login-page__intro">
          Il tuo spazio, da ritrovare.
        </p>
      </header>

      <form
        className="login-page__form"
        onSubmit={handleSubmit}
      >
        <label className="login-page__field">
          <span className="login-page__label">
            Email
          </span>

          <input
            className="login-page__input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
          />
        </label>

        <label className="login-page__field">
          <span className="login-page__label">
            Password
          </span>

          <input
            className="login-page__input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            required
          />
        </label>

        <button
          className="login-page__submit eliora-button--primary"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Accesso..." : "Entra"}
        </button>

        {message && (
          <p className="login-page__message">
            {message}
          </p>
        )}
      </form>
    </div>
  </main>
);
}