import { lazy, type ComponentType } from 'react'
import type { IssuableType } from '../types/sales'

/**
 * The Windows app's own screens. Each one is behind `import.meta.env.MODE === 'desktop'`, written out every time so the
 * bundler folds it: the website's build then has no trace of them, not even an unused chunk.
 */

/** Stands in for a desktop screen in the website's build, where it is never shown. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const None: ComponentType<any> = () => null

export const DesktopShell: ComponentType<{ admin?: boolean }> =
  import.meta.env.MODE === 'desktop' ? lazy(() => import('./shell/DesktopShell').then((module) => ({ default: module.DesktopShell }))) : None

export const DesktopAuthLayout: ComponentType =
  import.meta.env.MODE === 'desktop' ? lazy(() => import('./auth/DesktopAuthLayout').then((module) => ({ default: module.DesktopAuthLayout }))) : None

export const Dashboard: ComponentType = import.meta.env.MODE === 'desktop' ? lazy(() => import('./pages/DeskDashboard')) : None

export const DocumentList: ComponentType<{ type: IssuableType }> =
  import.meta.env.MODE === 'desktop' ? lazy(() => import('./pages/DeskDocumentList')) : None

export const DocumentDetail: ComponentType = import.meta.env.MODE === 'desktop' ? lazy(() => import('./pages/DeskDocumentDetail')) : None

export const Pos: ComponentType = import.meta.env.MODE === 'desktop' ? lazy(() => import('./pages/DeskPos')) : None

/** Loads every screen once the shell is up, so moving between them never waits (the guided tour hops between screens quickly). */
export function preloadScreens(): void {
  if (import.meta.env.MODE !== 'desktop') return
  void import('./pages/DeskDashboard')
  void import('./pages/DeskDocumentList')
  void import('./pages/DeskDocumentDetail')
  void import('./pages/DeskPos')
}
