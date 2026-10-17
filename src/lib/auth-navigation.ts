export function navigateAfterSignIn() {
  // A new document clears router and data caches belonging to a previous account.
  window.location.replace("/dashboard");
}
