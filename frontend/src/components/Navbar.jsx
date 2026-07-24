import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DarkModeToggle from "./DarkModeToggle";

const tabClass = ({ isActive }) =>
  `font-ui text-[13px] tracking-[0.14em] uppercase font-semibold pb-1 border-b-2 transition-colors ${
    isActive
      ? "border-redpen text-ink"
      : "border-transparent text-ink/50 hover:text-ink hover:border-ink/30"
  }`;

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-paper paper-texture">
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <div className="flex items-end justify-between">
          <div className="font-ui text-[11px] tracking-[0.2em] uppercase text-ink/60">
            {user && (
              <span className="font-ui text-[11px] tracking-[0.15em] uppercase text-ink/60">
                {user.name} &middot; {user.role}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <DarkModeToggle />
            <div className="font-ui text-[11px] tracking-[0.2em] uppercase text-ink/60 hidden sm:block">
              {today}
            </div>
          </div>
        </div>

        <h1 className="font-display font-black text-center text-ink text-4xl sm:text-5xl mt-2 tracking-tight">
          The Stone
        </h1>
        <p className="text-center font-ui text-[11px] tracking-[0.25em] uppercase text-ink/50 m-4">
          Spelling &amp; Grammar, Marked in Red
        </p>

        <div className="masthead-rule" />

        {user && (
          <nav className="flex items-center justify-center gap-8 py-3 flex-wrap">
            <NavLink to="/" end className={tabClass}>
              Submit Copy
            </NavLink>
            <NavLink to="/history" className={tabClass}>
              My Issues
            </NavLink>
            {isAdmin && (
              <>
                <NavLink to="/admin" end className={tabClass}>
                  Newsroom
                </NavLink>
                <NavLink to="/admin/staff" className={tabClass}>
                  Staff
                </NavLink>
                <NavLink to="/admin/files" className={tabClass}>
                  All Copy
                </NavLink>
              </>
            )}
            <button
              onClick={handleLogout}
              className="font-ui text-[13px] tracking-[0.14em] uppercase font-semibold pb-1 border-b-2 border-transparent text-ink/50 hover:text-redpen hover:border-redpen transition-colors"
            >
              Sign Out
            </button>
          </nav>
        )}
      </div>
      <div className="border-b border-rule" />
    </header>
  );
}
