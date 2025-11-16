// components/Header.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const orange = "#ff5702";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, credits } = useAuth(); // добавили credits
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Закрытие попапа по клику вне/ESC
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const initials = useMemo(() => {
    const name = (user?.name || user?.email || "User").trim();
    const parts = name.split("@")[0].split(/\s+/);
    const a = (parts[0]?.[0] || "").toUpperCase();
    const b = (parts[1]?.[0] || "").toUpperCase();
    return (a + b).slice(0, 2) || "U";
  }, [user]);

  const NavItem: React.FC<{ to: string; label: string }> = ({ to, label }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "inline-flex items-center rounded-xl px-3 py-2 text-sm transition",
          "hover:text-white hover:bg-white/5",
          isActive ? "text-white bg-white/10" : "text-neutral-300",
        ].join(" ")
      }
      onClick={() => setMobileOpen(false)}
    >
      {label}
    </NavLink>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800/60 bg-neutral-950/70 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Левый блок: бургер + логотип */}
          <div className="flex items-center gap-2">
            <button
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800/60 transition"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="#bbb" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>

            <Link to="/" className="group flex items-center gap-2">
              <div
                className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ background: "linear-gradient(135deg,#1f1f1f, #0f0f0f)" }}
              >
                <span className="text-lg font-black" style={{ color: orange }}>
                  eR
                </span>
              </div>
              <div className="leading-tight">
                <div className="text-[15px] font-semibold text-white">
                  <span style={{ color: orange }}>Etsy</span> Thumbnail
                </div>
                <div className="text-xs text-neutral-400 -mt-0.5">
                  Generator by <span style={{ color: orange }}>eRanker</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Центр: навигация */}
          <nav className="hidden lg:flex items-center gap-2">
            <NavItem to="/" label="Studio" />
            <NavItem to="/history" label="History" />
            <NavItem to="/subscriptions" label="Subscription" />
            <NavItem to="/docs" label="Docs" />
          </nav>

          {/* Правый блок: CTA + профиль */}
          <div className="flex items-center gap-2">
            <Link
              to="/new"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              New Project
            </Link>

            {!user ? (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-[--orange] px-3 py-2 text-sm font-medium text-black hover:opacity-90 transition"
                style={{ ["--orange" as any]: orange }}
              >
                Sign in
              </Link>
            ) : (
              <div className="relative">
                <button
                  ref={btnRef}
                  onClick={() => setMenuOpen((v) => !v)}
                  className="group inline-flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 pl-1 pr-3 py-1.5 hover:bg-neutral-800/60 transition"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  {/* credits (динамические + кликабельные) */}
                  <span
                    onClick={() => navigate("/subscriptions")}
                    className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-neutral-800/70 px-2 py-1 text-xs text-neutral-300 border border-neutral-700/60 cursor-pointer hover:bg-neutral-700/70 transition"
                    title="Перейти к тарифам"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" stroke="#bbb" strokeWidth="1.2" />
                    </svg>
                    Credits:{" "}
                    <strong
                      className={`text-white ${credits !== null && credits <= 10 ? "text-red-400" : ""}`}
                    >
                      {typeof credits === "number" ? credits : "—"}
                    </strong>
                  </span>

                  {/* аватар */}
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Profile"
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-neutral-700"
                    />
                  ) : (
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-neutral-800 text-sm font-semibold text-white ring-1 ring-neutral-700">
                      {initials}
                    </div>
                  )}

                  {/* caret */}
                  <svg
                    className={`transition ${menuOpen ? "rotate-180" : ""}`}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path d="M6 9l6 6 6-6" stroke="#bbb" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>

                {/* Dropdown */}
                {menuOpen && (
                  <div
                    ref={menuRef}
                    role="menu"
                    className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/95 shadow-2xl"
                  >
                    <div className="px-4 py-3 border-b border-neutral-800">
                      <div className="text-sm text-neutral-400">Signed in as</div>
                      <div className="truncate text-sm font-medium text-white">{user?.email}</div>
                    </div>
                    <div className="p-1">
                      <DropdownLink to="/profile" label="Profile" onClick={() => setMenuOpen(false)} />
                      <DropdownLink to="/subscriptions" label="Subscription" onClick={() => setMenuOpen(false)} />
                      <DropdownLink to="/settings" label="Settings" onClick={() => setMenuOpen(false)} />
                      <hr className="my-1 border-neutral-800" />
                      <button
                        className="w-full text-left rounded-xl px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 transition"
                        onClick={async () => {
                          setMenuOpen(false);
                          await logout();
                          navigate("/login");
                        }}
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Мобильное меню */}
        {mobileOpen && (
          <div className="lg:hidden animate-in fade-in slide-in-from-top-1">
            <div className="border-t border-neutral-800/60 py-3">
              <div className="flex flex-col gap-1">
                <MobileLink to="/" label="Studio" onClick={() => setMobileOpen(false)} />
                <MobileLink to="/history" label="History" onClick={() => setMobileOpen(false)} />
                <MobileLink to="/subscriptions" label="Subscription" onClick={() => setMobileOpen(false)} />
                <MobileLink to="/docs" label="Docs" onClick={() => setMobileOpen(false)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

const DropdownLink: React.FC<{ to: string; label: string; onClick?: () => void }> = ({
  to,
  label,
  onClick,
}) => (
  <Link
    to={to}
    onClick={onClick}
    className="block rounded-xl px-3 py-2 text-sm text-neutral-200 hover:bg-white/5 transition"
    role="menuitem"
  >
    {label}
  </Link>
);

const MobileLink: React.FC<{ to: string; label: string; onClick?: () => void }> = ({
  to,
  label,
  onClick,
}) => (
  <Link
    to={to}
    onClick={onClick}
    className="block rounded-xl px-3 py-2 text-[15px] text-neutral-200 hover:bg-white/5 transition"
  >
    {label}
  </Link>
);

export default Header;
