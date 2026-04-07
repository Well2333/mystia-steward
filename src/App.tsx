import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router';
import { SettingsPage } from '@/pages/SettingsPage';
import { NormalPage } from '@/pages/NormalPage';
import { RarePage } from '@/pages/RarePage';
import { cn } from '@/lib/utils';

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'px-5 py-2 text-sm font-medium rounded-full transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
        )
      }
    >
      {children}
    </NavLink>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-1">
            <div className="flex items-center gap-2 mr-6">
              <img src="/assets/icon.png" alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
              <span className="font-bold text-lg text-foreground">夜雀掌柜</span>
            </div>
            <NavItem to="/normal">普客</NavItem>
            <NavItem to="/rare">稀客</NavItem>
            <NavItem to="/settings">设置</NavItem>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Navigate to="/normal" replace />} />
            <Route path="/normal" element={<NormalPage />} />
            <Route path="/rare" element={<RarePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
