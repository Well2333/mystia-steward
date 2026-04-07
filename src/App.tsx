import { useEffect, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router';
import { UsageGuideModal } from '@/components/UsageGuideModal';
import { Button } from '@/components/ui/button';
import { SettingsPage } from '@/pages/SettingsPage';
import { NormalPage } from '@/pages/NormalPage';
import { RarePage } from '@/pages/RarePage';
import { useGameStore } from '@/stores/game-store';
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
  const guideAutoOpenDisabled = useGameStore((state) => state.guideAutoOpenDisabled);
  const setGuideAutoOpenDisabled = useGameStore((state) => state.setGuideAutoOpenDisabled);
  const [guideOpen, setGuideOpen] = useState(false);
  const [hasInitializedGuide, setHasInitializedGuide] = useState(false);

  useEffect(() => {
    if (hasInitializedGuide) return;

    setHasInitializedGuide(true);
    if (!guideAutoOpenDisabled) setGuideOpen(true);
  }, [guideAutoOpenDisabled, hasInitializedGuide]);

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
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}>
                <CircleHelp className="size-4" />
                使用指南
              </Button>
            </div>
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
        <UsageGuideModal
          open={guideOpen}
          onOpenChange={setGuideOpen}
          autoOpenDisabled={guideAutoOpenDisabled}
          onAutoOpenDisabledChange={setGuideAutoOpenDisabled}
        />
      </div>
    </BrowserRouter>
  );
}
