function isTextEditor(target) {
  const editor = target.closest?.('input, textarea, select, [contenteditable]');
  if (!editor) return false;
  if (editor.tagName === 'INPUT') {
    return !['range', 'color', 'checkbox', 'radio', 'button', 'submit', 'reset'].includes(editor.type);
  }
  return editor.matches('textarea, select') || editor.isContentEditable;
}

/** Preserve native text editing and control activation while handling artwork commands. */
export function setupKeyboardShortcuts(actions) {
  window.addEventListener('keydown', event => {
    const target = event.target;
    if (event.defaultPrevented || event.repeat || event.isComposing ||
        document.querySelector('dialog[open]') || isTextEditor(target)) return;
    const key = event.key.toLowerCase();
    const modifier = event.ctrlKey || event.metaKey;
    let action;
    if (modifier && !event.altKey) {
      if (key === 'z') action = event.shiftKey ? actions.redo : actions.undo;
      else if (key === 'y' && event.ctrlKey && !event.shiftKey) action = actions.redo;
      else if (key === 's' && !event.shiftKey) action = actions.downloadPNG;
      else if (key === 'c' && !event.shiftKey && !window.getSelection()?.toString()) action = actions.copyClipboard;
    } else if (!modifier && !event.altKey) {
      if (event.code === 'Space' && !event.shiftKey &&
          !target.closest?.('button, a, input, select, textarea, [contenteditable]')) action = actions.randomize;
      else if (key === 'h') action = actions.togglePanel;
      else if (key === 'm') action = actions.toggleMockup;
    }
    if (action) { event.preventDefault(); action(); }
  });
}
