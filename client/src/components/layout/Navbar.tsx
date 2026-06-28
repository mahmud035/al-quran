import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/features/auth/useAuth';
import { BookMarked, BookOpen, Search, Settings } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  { to: '/search', label: 'Search', icon: Search },
  { to: '/bookmarks', label: 'Bookmarks', icon: BookMarked },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          to="/"
          aria-label="Al Quran home"
          className="flex shrink-0 items-center gap-2 text-primary dark:text-emerald-300"
        >
          <BookOpen className="h-6 w-6 shrink-0" />
          <span className="hidden whitespace-nowrap text-lg font-bold sm:inline">
            Al Quran
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-soft text-primary dark:bg-slate-800 dark:text-emerald-300'
                    : 'text-stone-600 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}

          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-stone-500 dark:text-slate-400 md:inline">
                {user?.name}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => navigate('/login')}>
              Login
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
