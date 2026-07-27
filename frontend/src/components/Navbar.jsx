import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DarkModeToggle from "./DarkModeToggle";
import LogoMark from "./LogoMark";
import Logo from "../../assets/logo.jpeg";

const navLinkClass = ({ isActive }) =>
  `font-ui text-[13px] transition-colors ${
    isActive ? "text-ink font-medium" : "text-muted hover:text-ink"
  }`;

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-card border-b border-rule">
      <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
        <div className="flex items-center h-16 shrink-0">
          <img src={Logo} alt="Logo" className="h-full w-auto object-contain" />
        </div>
        <div className="text-center hidden sm:block">
          <h1 className="font-display font-bold text-2xl text-ink leading-none">
            The Stone<span className="text-accent">.</span>
          </h1>
          <p className="font-serif italic text-muted text-[12px] mt-0.5">
            Nightly Pre-Press Proof
          </p>
        </div>

        {user ? (
          <nav className="flex items-center gap-5 shrink-0">
            <NavLink to="/" end className={navLinkClass}>
              New proof
            </NavLink>
            <NavLink to="/history" className={navLinkClass}>
              History
            </NavLink>
            {isAdmin && (
              <>
                <NavLink to="/admin" end className={navLinkClass}>
                  Usage
                </NavLink>
                <NavLink to="/admin/staff" className={navLinkClass}>
                  Staff
                </NavLink>
                <NavLink to="/admin/files" className={navLinkClass}>
                  All Copy
                </NavLink>
              </>
            )}
            <DarkModeToggle />
            <span className="font-ui text-[13px] text-muted hidden md:inline">
              {user.name} &middot; {user.role}
            </span>
            <button
              onClick={handleLogout}
              className="font-ui text-[13px] text-muted hover:text-ink"
            >
              Log out
            </button>
          </nav>
        ) : (
          <div className="shrink-0">
            <DarkModeToggle />
          </div>
        )}
      </div>
    </header>
  );
}
