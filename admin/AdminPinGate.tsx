import { FormEvent, ReactNode, useState } from "react";

const ADMIN_PIN = "3536";
const AUTH_STORAGE_KEY = "blazeo-admin-authenticated";

export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_STORAGE_KEY) === "true";
}

export function lockAdmin(): void {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

interface AdminPinGateProps {
  children: ReactNode;
}

export function AdminPinGate({ children }: AdminPinGateProps) {
  const [authenticated, setAuthenticated] = useState(isAdminAuthenticated);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (pin === ADMIN_PIN) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, "true");
      setAuthenticated(true);
      setError("");
      setPin("");
      return;
    }

    setError("Incorrect PIN. Please try again.");
    setPin("");
  };

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <div className="admin-pin-screen">
      <form className="admin-pin-card" onSubmit={handleSubmit}>
        <h1>Admin access</h1>
        <p className="admin-note">Enter the 4-digit PIN to open the schedule admin.</p>

        <label className="admin-field">
          <span>PIN</span>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="off"
            autoFocus
            placeholder="••••"
            value={pin}
            onChange={(event) => {
              const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 4);
              setPin(digitsOnly);
              if (error) {
                setError("");
              }
            }}
          />
        </label>

        {error && <div className="admin-status error">{error}</div>}

        <button type="submit" className="admin-button primary admin-pin-submit" disabled={pin.length !== 4}>
          Unlock admin
        </button>
      </form>
    </div>
  );
}
