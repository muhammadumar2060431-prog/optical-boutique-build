import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { KeyRound, Loader2, LogIn, ShieldCheck, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup" | "recover";
type RecoveryStep = "verify" | "reset";

const modes: Array<{ id: Mode; label: string; icon: typeof LogIn }> = [
  { id: "login", label: "Sign in", icon: LogIn },
  { id: "signup", label: "First signup", icon: UserPlus },
  { id: "recover", label: "Forgot password", icon: KeyRound },
];

async function postAuth(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    recoveryToken?: string;
    error?: { code?: string; message?: string };
  };
  if (!response.ok) {
    const error = new Error(payload.error?.message ?? "Unable to complete the request.");
    error.name = payload.error?.code ?? "AuthRequestError";
    throw error;
  }
  return payload;
}

export function AdminAuthPanel() {
  const { login } = useStore();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [school, setSchool] = useState("");
  const [friend, setFriend] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [signupAvailable, setSignupAvailable] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>("verify");
  const [recoveryToken, setRecoveryToken] = useState("");

  const visibleModes = useMemo(
    () => modes.filter((item) => item.id !== "signup" || signupAvailable),
    [signupAvailable],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5_000);
    void fetch("/api/v1/admin/status", {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { signupAvailable?: boolean };
        setSignupAvailable(payload.signupAvailable === true);
      })
      .catch(() => {})
      .finally(() => window.clearTimeout(timer));

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setEmail("");
    setError("");
    setNotice("");
    setPassword("");
    setConfirmPassword("");
    setSetupCode("");
    setSchool("");
    setFriend("");
    setCity("");
    setRecoveryStep("verify");
    setRecoveryToken("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const isPasswordStep = mode === "signup" || (mode === "recover" && recoveryStep === "reset");
    if (isPasswordStep && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        const result = await login(email.trim(), password);
        if (!result.success) throw new Error(result.error ?? "Incorrect email or password.");
        return;
      }

      const answers = { school, friend, city };
      if (mode === "signup") {
        await postAuth("/api/v1/admin/signup", {
          email: email.trim(),
          password,
          setupCode,
          answers,
        });
        changeMode("login");
        setSignupAvailable(false);
        setEmail(email.trim());
        setNotice("Admin account created. Sign in with your new password.");
      } else if (recoveryStep === "verify") {
        const result = await postAuth("/api/v1/admin/recover", {
          action: "verify",
          email: email.trim(),
          answers,
        });
        if (!result.recoveryToken) {
          throw new Error("Unable to start secure password recovery.");
        }
        setRecoveryToken(result.recoveryToken);
        setRecoveryStep("reset");
        setSchool("");
        setFriend("");
        setCity("");
        setNotice("Identity verified. Set your new password within 5 minutes.");
      } else {
        await postAuth("/api/v1/admin/recover", {
          action: "reset",
          recoveryToken,
          newPassword: password,
        });
        const recoveredEmail = email.trim();
        changeMode("login");
        setEmail(recoveredEmail);
        setNotice("Password changed successfully. You can now sign in.");
      }
    } catch (submissionError) {
      if (
        mode === "signup" &&
        submissionError instanceof Error &&
        submissionError.message.includes("already complete")
      ) {
        setSignupAvailable(false);
        setMode("login");
      }
      if (
        mode === "recover" &&
        submissionError instanceof Error &&
        submissionError.name === "RECOVERY_TOKEN_INVALID"
      ) {
        setRecoveryStep("verify");
        setRecoveryToken("");
        setPassword("");
        setConfirmPassword("");
      }
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to complete the request.",
      );
    } finally {
      setBusy(false);
    }
  };

  const needsQuestions = mode === "signup" || (mode === "recover" && recoveryStep === "verify");
  const needsPassword = mode !== "recover" || recoveryStep === "reset";

  return (
    <div className="grid min-h-screen place-items-center bg-jet px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-white/10 bg-card shadow-2xl">
        <div className="border-b border-stone bg-zinc-50 px-6 py-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center bg-jet text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="eyebrow text-gold">Secure administration</p>
              <h1 className="font-display text-2xl text-foreground">Admin access</h1>
            </div>
          </div>
        </div>

        <div
          className="grid border-b border-stone"
          style={{ gridTemplateColumns: `repeat(${visibleModes.length}, minmax(0, 1fr))` }}
          role="tablist"
        >
          {visibleModes.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={mode === item.id}
              onClick={() => changeMode(item.id)}
              className={cn(
                "flex min-h-12 items-center justify-center gap-1.5 border-r border-stone px-2 text-[11px] font-semibold last:border-r-0",
                mode === item.id
                  ? "bg-jet text-white"
                  : "bg-white text-ink-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <form
          key={`${mode}-${recoveryStep}`}
          onSubmit={handleSubmit}
          className="space-y-4 p-6"
          autoComplete={mode === "login" ? "on" : "off"}
        >
          <div className="space-y-2">
            <Label htmlFor="admin-email">Admin email</Label>
            <Input
              id="admin-email"
              name={mode === "login" ? "username" : "admin-recovery-identity"}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete={mode === "login" ? "username" : "off"}
              required
              disabled={busy || (mode === "recover" && recoveryStep === "reset")}
            />
          </div>

          {needsPassword && (
            <div className="space-y-2">
              <Label htmlFor="admin-password">
                {mode === "login" ? "Password" : "New password"}
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={mode === "login" ? 1 : 10}
                required
                disabled={busy}
              />
              {mode !== "login" && (
                <p className="text-[11px] text-ink-muted">
                  At least 10 characters with uppercase, lowercase, and a number.
                </p>
              )}
            </div>
          )}

          {(mode === "signup" || (mode === "recover" && recoveryStep === "reset")) && (
            <div className="space-y-2">
              <Label htmlFor="admin-confirm-password">Confirm password</Label>
              <Input
                id="admin-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={10}
                required
                disabled={busy}
              />
            </div>
          )}

          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="admin-setup-code">Private setup code</Label>
              <Input
                id="admin-setup-code"
                type="password"
                value={setupCode}
                onChange={(event) => setSetupCode(event.target.value)}
                required
                disabled={busy}
              />
            </div>
          )}

          {needsQuestions && (
            <fieldset className="space-y-4 border-t border-stone pt-4">
              <legend className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Security questions
              </legend>
              <div className="space-y-2">
                <Label htmlFor="security-school">What was the name of your first school?</Label>
                <Input
                  id="security-school"
                  name={`${mode}-school-response`}
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  required
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-form-type="other"
                  className="security-answer-input"
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="security-friend">
                  What is your childhood best friend's first name?
                </Label>
                <Input
                  id="security-friend"
                  name={`${mode}-friend-response`}
                  type="text"
                  value={friend}
                  onChange={(e) => setFriend(e.target.value)}
                  required
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-form-type="other"
                  className="security-answer-input"
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="security-city">In which city were you born?</Label>
                <Input
                  id="security-city"
                  name={`${mode}-city-response`}
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-form-type="other"
                  className="security-answer-input"
                  disabled={busy}
                />
              </div>
            </fieldset>
          )}

          {error && (
            <p
              role="alert"
              className="border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
            >
              {notice}
            </p>
          )}

          <Button type="submit" className="min-h-11 w-full" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {mode === "login"
              ? "Sign in"
              : mode === "signup"
                ? "Create admin"
                : recoveryStep === "verify"
                  ? "Verify security answers"
                  : "Change password"}
          </Button>

          <Link to="/" className="block text-center text-xs text-ink-muted hover:text-foreground">
            Return to store
          </Link>
        </form>
      </div>
    </div>
  );
}
