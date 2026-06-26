/**
 * Detects whether the current runtime is the student mobile app.
 *
 * The Capacitor app loads the same web deployment inside a native shell, so we
 * detect it at runtime (Capacitor.isNativePlatform). A build-time override
 * (NEXT_PUBLIC_APP_TARGET=student) is also supported for a dedicated student
 * web deployment. Teachers use the web portal; students use the app (req #1).
 */
export function isStudentApp(): boolean {
  if (typeof window !== 'undefined') {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    if (cap?.isNativePlatform?.()) return true
  }
  if (process.env.NEXT_PUBLIC_APP_TARGET === 'student') return true
  return false
}
