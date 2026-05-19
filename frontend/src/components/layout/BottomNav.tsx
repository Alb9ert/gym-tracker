import { NavLink } from 'react-router-dom';
import { Dumbbell, CalendarCheck, Scale, TrendingUp, Trophy } from 'lucide-react';

const navItems = [
  { to: '/',            label: 'Workouts', Icon: Dumbbell },
  { to: '/gym',         label: 'Gym',      Icon: CalendarCheck },
  { to: '/body-weight', label: 'Weight',   Icon: Scale },
  { to: '/analytics',   label: 'Progress', Icon: TrendingUp },
  { to: '/strength',    label: 'Strength', Icon: Trophy },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-border pb-safe z-40 shadow-[0_-1px_0_0_#C7C7CC]">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
                isActive ? 'text-accent' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="text-xs font-semibold">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
