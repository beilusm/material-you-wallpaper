/**
 * 历史快照管理器 (支持撤销 Undo 与重做 Redo)
 */
export class HistoryManager {
  constructor(limit = 20) {
    this.limit = limit;
    this.stack = [];
    this.pointer = -1;
  }

  push(state) {
    // 裁剪掉当前指针之后的重做栈
    this.stack = this.stack.slice(0, this.pointer + 1);
    // 深拷贝轻量核心参数
    const snapshot = {
      artMode: state.artMode,
      targetW: state.targetW,
      targetH: state.targetH,
      color1: state.color1,
      color2: state.color2,
      bandCount: state.bandCount,
      angle: state.angle,
      curvature: state.curvature,
      harmonics: state.harmonics,
      hasShadow: state.hasShadow,
      useGradient: state.useGradient,
      grain: state.grain,
      seed: state.seed
    };

    this.stack.push(snapshot);
    if (this.stack.length > this.limit) {
      this.stack.shift();
    } else {
      this.pointer++;
    }
  }

  canUndo() {
    return this.pointer > 0;
  }

  canRedo() {
    return this.pointer < this.stack.length - 1;
  }

  undo() {
    if (!this.canUndo()) return null;
    this.pointer--;
    return JSON.parse(JSON.stringify(this.stack[this.pointer]));
  }

  redo() {
    if (!this.canRedo()) return null;
    this.pointer++;
    return JSON.parse(JSON.stringify(this.stack[this.pointer]));
  }
}
