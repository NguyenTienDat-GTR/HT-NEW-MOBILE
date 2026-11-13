import { createContext, useContext, type ReactNode } from 'react';

import { themes, type Theme, type ThemeName } from './tokens';

const ThemeContext = createContext<Theme>(themes.light);

interface ThemeProviderProps {
  name?: ThemeName;
  children: ReactNode;
}

/** Hiện chỉ có bản sáng (FE chưa có dark mode); thêm bản tối thì chọn ở đây theo lựa chọn của người dùng. */
export function ThemeProvider({ name = 'light', children }: ThemeProviderProps) {
  return <ThemeContext.Provider value={themes[name]}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
