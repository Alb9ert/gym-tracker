import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Workouts', icon: '🏋️' },
  { to: '/body-weight', label: 'Weight', icon: '⚖️' },
  { to: '/analytics', label: 'Progress', icon: '📈' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-border pb-safe z-40 shadow-[0_-1px_0_0_#C7C7CC]">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-xl transition-all ${
                isActive ? 'text-accent' : 'text-gray-400'
              }`
            }
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-xs font-semibold">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
