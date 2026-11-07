# Manual Safari test checklist

Load `extension/` using the README instructions. Test with a few ordinary HTTP(S) pages and a second Safari window. Commands operate on the tab where the palette was opened, even after asynchronous work.

- Press ⌘K with focus in the page and then in the address bar. The search field should receive typing immediately. Confirm the shortcut assigned in Safari Settings if necessary.
- Press ⌘K again, Escape, and click the backdrop. Each should dismiss the centered view. Escape/backdrop dismissal should restore the page’s previously focused control.
- Type part of a tab title, its domain, multiple words, or initials such as `hig` for Human Interface Guidelines. Use ↑/↓ and Return to switch; the destination window should come forward.
- Verify recent tabs appear first after switching among a few tabs.
- Click Tabs and Commands; cycle them with Control-Tab. Check `@` and `>` prefixes and an empty result in Tabs mode.
- Type `example.com`, a full HTTPS URL, a general search, and `yt safari`. Return should open the requested destination in a new tab in the original window.
- Select Copy Page URL and paste into a disposable text field to confirm the address. This replaces the clipboard contents when explicitly invoked.
- Run Reload, Duplicate Tab, Mute/Unmute, and New Tab/Window. Run Close Tab only on a disposable tab. Confirm no action repeats if Return is pressed while one is in progress.
- Open the toolbar popup on Start Page. Test ⌘K fallback there and on a page where website access is denied. If Safari declines the programmatic popup, the toolbar button remains available.
- Use ⌘Return on a tab result to open its address in another tab. `javascript:`, `file:`, and credential-bearing addresses must never become executable navigation results.
- Deny access to a website; verify errors are understandable and no injected UI remains stuck on the page.
- If you enable Commander in Private Browsing, open private and regular windows. Each palette should list only the corresponding browsing session. Confirm profile isolation in another Safari profile if used.
- Check light/dark appearance, narrow windows, page zoom, Reduce Motion, Increase Contrast, and VoiceOver combobox/result announcements.
- Reload the temporary extension after source edits. Check Safari’s extension background inspector for errors.

## Already checked during initial development

- JavaScript syntax, manifest file references, and the Command+K manifest entry.
- Nine Node checks for search/ranking/navigation and background operations, private-session boundaries, overlay tokens, and popup fallback.
- Native Xcode app/extension compilation and ad-hoc signing.
- Browser preview in light and dark mode, keyboard selection, command aliases, and site searches.

The preview uses sample tabs and simulated actions. It is not evidence that Safari’s extension permissions and shortcut routing have been exercised end to end.
