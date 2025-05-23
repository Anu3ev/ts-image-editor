import { ActiveSelection } from 'fabric'

export default class SelectionManager {
  /**
   * @param {object} options
   * @param {ImageEditor} options.editor - экземпляр редактора с доступом к canvas
   */
  constructor({ editor }) {
    this.editor = editor
  }

  /**
   * Выделить все объекты
   * @fires editor:all-objects-selected
   */
  selectAll() {
    const { canvas, canvasManager } = this.editor

    canvas.discardActiveObject()

    const sel = new ActiveSelection(canvasManager.getObjects(), { canvas })

    canvas.setActiveObject(sel)
    canvas.requestRenderAll()

    canvas.fire('editor:all-objects-selected', { selected: sel })
  }
}
