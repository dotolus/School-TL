import { useState } from "react";
import { api } from "../api";

export function LoginForm({ onLoggedIn }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(password);
      onLoggedIn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-card">
      <h2>התחברות לניהול</h2>
      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          סיסמה
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        <div className="admin-actions">
          <button className="btn" type="submit" disabled={busy}>
            התחברות
          </button>
        </div>
      </form>
    </div>
  );
}
