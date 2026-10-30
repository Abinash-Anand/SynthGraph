/**
 * Updates the query string of the current page without asking the server for
 * anything.
 *
 * `router.push("?tab=x")` is a real navigation: Next re-runs the whole server
 * page for the new URL, so a view switch that only needs data the page has
 * already loaded still waits on every backend call behind it. Native
 * `history.pushState` changes the URL (back/forward and `useSearchParams`
 * follow it - Next wires the two together) and leaves the loaded data alone.
 *
 * Only for state the server page does not read. If the page ever starts
 * reading these params on the server, use `router.push` for them instead.
 */
export function pushSearchParams(params: URLSearchParams): void {
  const query = params.toString();
  window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
}
