// Apply only on a fresh installed-app document, never when resuming an editor.
// Older iPhone shortcuts may still contain a chapter fragment.
const installed = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
if (installed && location.hash && !history.state?.chroniclesNavigation && performance.getEntriesByType('navigation')[0]?.type === 'navigate') {
  history.replaceState(null, '', location.pathname + location.search);
}
