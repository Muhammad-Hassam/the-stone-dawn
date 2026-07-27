import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DarkModeToggle from "./DarkModeToggle";
import Logo from "../../assets/logo.jpeg";
import { Link } from "react-router-dom";
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
      <div className=" px-6 h-20 flex items-center justify-between gap-4">
        {/* <div className="flex items-center h-16 shrink-0">
          <img src={Logo} alt="Logo" className="h-full w-auto object-contain" />
        </div> */}
        <div className="flex items-center">
          <Link to="/" className="flex items-center h-16 shrink-0">
            <img
              src={Logo}
              alt="Logo"
              className="h-full w-auto object-contain"
            />
          </Link>
          <h1 className="font-display font-bold text-2xl ml-5 text-ink leading-none">
            DAWN
          </h1>
        </div>
        <div className="text-center hidden sm:block ml-5">
          <h1 className="font-display font-bold text-2xl text-ink leading-none">
            The Stone<span className="text-accent">.</span>
          </h1>
          <span className="font-ui text-[13px] text-muted hidden md:inline">
            {user.name} &middot; {user.role}
          </span>
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
