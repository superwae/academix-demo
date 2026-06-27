import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { userService, type UserUiPreferences } from '../services/userService';
import { applyAppearance } from './applyTheme';
import { MIX_THEMES, THEMES, type MixThemeId, type ThemeId } from './themes';
import { normalizeAccentTheme, type ColorMode } from './themePresets';

const THEME_IDS = new Set(THEMES.map((t) => t.id));
const MIX_IDS = new Set(MIX_THEMES.map((m) => m.id));

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function hasRealApiToken(): boolean {
  if (typeof window === 'undefined') return false;
  const t = localStorage.getItem('accessToken');
  return !!t;
}

/** Apply preferences from server (login response or GET /users/me) to Zustand + DOM. */
export function applyServerUiPreferencesToStore(prefs: UserUiPreferences | undefined | null): void {
  if (!prefs || typeof prefs.theme !== 'string') return;

  const mix =
    prefs.mixTheme && MIX_IDS.has(prefs.mixTheme as MixThemeId)
      ? (prefs.mixTheme as MixThemeId)
      : undefined;

  const colorMode: ColorMode =
    prefs.colorMode === 'dark'
      ? 'dark'
      : prefs.theme === 'dark'
        ? 'dark'
        : 'light';

  if (mix) {
    useAppStore.setState((s) => ({
      data: {
        ...s.data,
        colorMode,
        theme: 'custom',
        customThemeColor: undefined,
        mixTheme: mix,
      },
    }));
    applyAppearance(colorMode, 'custom', undefined, mix);
    return;
  }

  const rawTheme = THEME_IDS.has(prefs.theme as ThemeId) ? (prefs.theme as ThemeId) : 'light';
  const accent = normalizeAccentTheme(rawTheme);
  const custom =
    accent === 'custom' && prefs.customThemeColor ? prefs.customThemeColor : undefined;

  useAppStore.setState((s) => ({
    data: {
      ...s.data,
      colorMode,
      theme: accent,
      customThemeColor: accent === 'custom' ? custom ?? s.data.customThemeColor : undefined,
      mixTheme: undefined,
    },
  }));
  applyAppearance(colorMode, accent, accent === 'custom' ? custom : undefined, null);
}

/** Debounced PUT when the user changes theme in the UI. */
export function scheduleSyncUiPreferencesToServer(): void {
  if (!hasRealApiToken()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void (async () => {
      try {
        const { colorMode, theme, customThemeColor, mixTheme } = useAppStore.getState().data;
        const currentPreferences = useAuthStore.getState().user?.uiPreferences;
        const body: UserUiPreferences = {
          theme,
          colorMode,
          customThemeColor: customThemeColor ?? null,
          mixTheme: mixTheme ?? null,
          notificationsEnabled: currentPreferences?.notificationsEnabled ?? null,
        };
        const updated = await userService.updateUiPreferences(body);
        const u = useAuthStore.getState().user;
        if (u && updated.id === u.id) {
          useAuthStore.setState({
            user: { ...u, uiPreferences: updated.uiPreferences },
          });
        }
      } catch {
        // offline or 401 — local persist still applies
      }
    })();
  }, 600);
}

/** After page load: pull saved theme from API so another device’s choice applies. */
export async function hydrateUiPreferencesFromServer(): Promise<void> {
  if (!hasRealApiToken()) return;
  try {
    const user = await userService.getMe();
    if (user.uiPreferences) {
      applyServerUiPreferencesToStore(user.uiPreferences);
      const u = useAuthStore.getState().user;
      if (u && u.id === user.id) {
        useAuthStore.setState({ user: { ...u, uiPreferences: user.uiPreferences } });
      }
    }
  } catch {
    // ignore
  }
}
