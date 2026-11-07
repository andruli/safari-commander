function show(enabled) {
  document.getElementById('state').textContent = enabled ? 'Commander is enabled. You’re ready to press ⌘K.' : 'Enable Commander in Safari to get started.';
}
document.querySelector('.open-preferences').addEventListener('click', () => {
  webkit.messageHandlers.controller.postMessage('open-preferences');
});
