export function unlockOrientation() {
  if (typeof window === 'undefined') return;
  try {
    if ((window as any).AndroidOrientation) {
      if (typeof (window as any).AndroidOrientation.unlock === 'function') {
        (window as any).AndroidOrientation.unlock();
      }
    }
    if ((window as any).Capacitor && (window as any).Capacitor.Plugins && (window as any).Capacitor.Plugins.AndroidOrientation) {
      if (typeof (window as any).Capacitor.Plugins.AndroidOrientation.unlock === 'function') {
        (window as any).Capacitor.Plugins.AndroidOrientation.unlock();
      }
    }
    if (window.screen) {
      const screenObj: any = window.screen;
      const orientation = screenObj.orientation || screenObj.mozOrientation || screenObj.msOrientation;
      if (orientation && typeof orientation.lock === 'function') {
        // Instead of unlock(), which reverts to manifest default (which might be portrait),
        // we explicitly lock to 'any' to allow rotation.
        orientation.lock('any').catch((e: any) => {
          console.warn('Orientation lock(any) failed:', e);
          if (typeof orientation.unlock === 'function') {
             orientation.unlock();
          }
        });
      } else if (orientation && typeof orientation.unlock === 'function') {
        orientation.unlock();
      }
    }
  } catch (e) {
    console.warn('Orientation unlock error:', e);
  }
}
