import { useState } from "react";
import { supabase } from "../lib/supabase";

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
    <main>
      <form onSubmit={handleSubmit}>
        <h1>Eliora</h1>

        <p>Il tuo spazio, da ritrovare.</p>

        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
          />
        </label>

        <label>
          Password
          <input
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
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Accesso..." : "Entra"}
        </button>

        {message && <p>{message}</p>}
      </form>
    </main>
  );
}