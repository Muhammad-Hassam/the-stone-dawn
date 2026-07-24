import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import DarkModeToggle from "../components/DarkModeToggle";

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
      toast.success("Welcome back to the desk");
      const redirectTo = location.state?.from?.pathname || "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper paper-texture flex items-center justify-center px-6">
      <div className="absolute top-6 right-6">
        <DarkModeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-ui text-[11px] tracking-[0.25em] uppercase text-redpen mb-2">
            Staff Sign-In
          </div>
          <h1 className="font-display font-black text-4xl text-ink">
            The Stone
          </h1>
          <div className="masthead-rule my-4" />
          <p className="font-serif text-ink/60 text-sm">
            Sign in to submit copy or run the newsroom.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-sm shadow-sm p-8 space-y-5"
        >
          <div>
            <label className="block font-ui text-[11px] tracking-[0.1em] uppercase text-ink/50 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full font-serif border-b-2 border-ink/20 focus:border-redpen bg-transparent px-1 py-2 outline-none text-ink"
              placeholder="you@newsroom.com"
            />
          </div>

          <div>
            <label className="block font-ui text-[11px] tracking-[0.1em] uppercase text-ink/50 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full font-serif border-b-2 border-ink/20 focus:border-redpen bg-transparent px-1 py-2 outline-none text-ink"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full font-ui text-sm tracking-[0.15em] uppercase font-semibold bg-redpen hover:bg-[#8f2e24] disabled:opacity-50 text-card py-3 rounded-sm transition-colors"
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center font-ui text-[11px] text-ink/40 mt-6">
          New staff accounts are created by an admin from the Newsroom panel.
        </p>
      </div>
    </div>
  );
}
