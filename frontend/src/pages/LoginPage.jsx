import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import DarkModeToggle from "../components/DarkModeToggle";
import LogoMark from "../components/LogoMark";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      const redirectTo = location.state?.from?.pathname || "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="absolute top-6 right-6">
        <DarkModeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <LogoMark size={36} />
          </div>
          <h1 className="font-display font-bold text-3xl text-ink">
            The Stone<span className="text-accent">.</span>
          </h1>
          <p className="font-serif italic text-muted text-sm mt-1">
            Nightly Pre-Press Proof
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-rule rounded-md p-8 space-y-5"
        >
          <div>
            <label className="block font-ui text-[12px] text-muted mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full font-serif border border-rule rounded-md focus:border-ink bg-paper px-3 py-2 outline-none text-ink"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block font-ui text-[12px] text-muted mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full font-serif border border-rule rounded-md focus:border-ink bg-paper px-3 py-2 outline-none text-ink"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full font-ui text-sm font-medium bg-ink text-card py-2.5 rounded-md hover:opacity-85 disabled:opacity-50 transition-opacity"
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center font-ui text-[12px] text-muted mt-6">
          New staff accounts are created by an admin.
        </p>
      </div>
    </div>
  );
}
