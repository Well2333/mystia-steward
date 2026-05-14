import { useEffect, useMemo, useRef } from 'react';
import { CircleHelp, ExternalLink } from 'lucide-react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router';
import { AppGuide, APP_GUIDE_OPEN_EVENT } from '@/components/AppGuide';
import { Button } from '@/components/ui/button';
import { SettingsPage } from '@/pages/SettingsPage';
import { NormalPage } from '@/pages/NormalPage';
import { RarePage } from '@/pages/RarePage';
import { useGameStore } from '@/stores/game-store';
import {
  DEBUG_DEFAULT_PLACE,
  createDebugFakeConfig,
  prepareFakeSaveDebugSession,
  readDebugFlags,
  restoreStoreAfterDebugIfNeeded,
} from '@/lib/debug-mode';
import { cn } from '@/lib/utils';

function NavItem({
  to,
  children,
  guideTarget,
}: {
  to: string;
  children: React.ReactNode;
  guideTarget?: string;
}) {
  return (
    <NavLink
      to={to}
      data-guide={guideTarget}
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
      <AppShell />
    </BrowserRouter>
  );
}

function AppShell() {
  const appCommitHash = __APP_COMMIT_HASH__;
  const debugFlags = useMemo(() => readDebugFlags(window.location.search), []);
  const fakeSaveAppliedRef = useRef(false);

  useEffect(() => {
    if (!debugFlags.fakeSave) {
      if (restoreStoreAfterDebugIfNeeded()) {
        window.location.reload();
      }
      return;
    }

    if (fakeSaveAppliedRef.current) return;

    prepareFakeSaveDebugSession();
    const state = useGameStore.getState();
    state.importConfigData(createDebugFakeConfig());
    state.setNormalSelectedPlace(DEBUG_DEFAULT_PLACE);
    state.setRareSelectedPlace(DEBUG_DEFAULT_PLACE);
    fakeSaveAppliedRef.current = true;
  }, [debugFlags.fakeSave]);

  const debugLabels = [
    debugFlags.fakeSave ? '假配置' : null,
    debugFlags.noTutorial ? '关闭自动教程' : null,
  ].filter((item): item is string => item !== null);

  return (
    <div className="min-h-screen">
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-1">
          <div className="flex items-center gap-2 mr-6">
            <img src="/assets/icon.png" alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
            <span className="font-bold text-lg text-foreground">夜雀掌柜</span>
          </div>
          <NavItem to="/normal" guideTarget="nav-normal">普客</NavItem>
          <NavItem to="/rare" guideTarget="nav-rare">稀客</NavItem>
          <NavItem to="/settings" guideTarget="nav-settings">设置</NavItem>
          <div className="ml-auto flex items-center gap-2">
            {debugLabels.length > 0 && (
              <span className="hidden md:inline rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900">
                Debug: {debugLabels.join(' / ')}
              </span>
            )}
            <span className="hidden sm:inline text-[11px] text-muted-foreground px-2">
              更新时间 {appCommitHash}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://github.com/Well2333/mystia-steward', '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="size-4" />
              GitHub
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-guide="nav-guide-button"
              onClick={() => window.dispatchEvent(new Event(APP_GUIDE_OPEN_EVENT))}
            >
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
      <AppGuide suppressAutoStart={debugFlags.noTutorial} />
    </div>
  );
}
