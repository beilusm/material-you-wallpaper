import { snapshotWallpaper, WALLPAPER_KEYS } from './state.js';

export class HistoryManager {
  constructor(limit = 20) {
    if (!Number.isInteger(limit) || limit < 2) throw new RangeError('历史容量必须为至少 2 的整数');
    this.limit = limit;
    this.stack = [];
    this.pointer = -1;
  }

  push(state) {
    const snapshot = snapshotWallpaper(state);
    const current = this.stack[this.pointer];
    if (current && WALLPAPER_KEYS.every(key => current[key] === snapshot[key])) return false;
    this.stack = this.stack.slice(0, this.pointer + 1);
    this.stack.push(snapshot);
    if (this.stack.length > this.limit) this.stack.shift();
    this.pointer = this.stack.length - 1;
    return true;
  }

  canUndo() { return this.pointer > 0; }
  canRedo() { return this.pointer >= 0 && this.pointer < this.stack.length - 1; }

  undo() {
    if (!this.canUndo()) return null;
    return { ...this.stack[--this.pointer] };
  }

  redo() {
    if (!this.canRedo()) return null;
    return { ...this.stack[++this.pointer] };
  }
}
