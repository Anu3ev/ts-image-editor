export default class InteractionBlocker {
  /**
   * @param {object} options
   * @param {ImageEditor} options.editor – экземпляр редактора
   */
  constructor({ editor }) {
    this.editor = editor
    this.isBlocked = false
    this.overlayMask = null

    this._createOverlay()
  }

  /**
   * Создаёт overlay для блокировки монтажной области
   * @private
   * @returns {void}
   */
  _createOverlay() {
    const {
      historyManager,
      options: { overlayMaskColor = 'rgba(0,0,0,0.5)' }
    } = this.editor

    historyManager.suspendHistory()

    this.overlayMask = this.editor.shapeManager.addRectangle({
      fill: overlayMaskColor,
      selectable: false,
      evented: true,
      hoverCursor: 'not-allowed',
      hasBorders: false,
      hasControls: false,
      visible: false,
      id: 'overlay-mask'
    }, { withoutSelection: true })

    historyManager.resumeHistory()
  }

  /**
   * Обновляет размеры и позицию overlay, выносит его на передний план
   * @returns {void}
   */
  refresh() {
    const { canvas, montageArea, historyManager } = this.editor

    if (!montageArea || !this.overlayMask) return

    historyManager.suspendHistory()

    // получаем в экранных координатах то, что отображает монтажную зону
    montageArea.setCoords()
    const { left, top, width, height } = montageArea.getBoundingRect()

    // обновляем размеры и позицию overlay
    this.overlayMask.set({ left, top, width, height })
    canvas.discardActiveObject()

    this.editor.layerManager.bringToFront(this.overlayMask, { withoutSave: true })
    historyManager.resumeHistory()
  }

  /**
   * Выключает редактор:
   * - убирает все селекты, события мыши, скейл/драг–н–дроп
   * - делает все объекты не‑evented и не‑selectable
   * - делает видимым overlayMask поверх всех объектов в монтажной области
   * @returns {void}
   */
  block() {
    if (this.isBlocked) return

    const { canvas, historyManager } = this.editor

    historyManager.suspendHistory()
    this.isBlocked = true

    // Убираем все селекты, события мыши, скейл/драг–н–дроп
    canvas.discardActiveObject()
    canvas.selection = false
    canvas.skipTargetFind = true

    // Делаем все объекты не‑evented и не‑selectable
    this.editor.getObjects().forEach((obj) => {
      obj.evented = false
      obj.selectable = false
    })

    // блокируем сами canvas‑элементы в DOM
    canvas.upperCanvasEl.style.pointerEvents = 'none'
    canvas.lowerCanvasEl.style.pointerEvents = 'none'

    this.overlayMask.visible = true
    this.refresh()

    canvas.fire('editor:disabled')
    historyManager.resumeHistory()
  }

  /**
   * Включает редактор
   * @returns {void}
   */
  unblock() {
    if (!this.isBlocked) return

    const { canvas, historyManager } = this.editor

    historyManager.suspendHistory()
    this.isBlocked = false

    // возвращаем интерактивность
    canvas.selection = true
    canvas.skipTargetFind = false

    // возвращаем селекты & ивенты
    this.editor.getObjects().forEach((obj) => {
      obj.evented = true
      obj.selectable = true
    })

    // разблокируем DOM
    canvas.upperCanvasEl.style.pointerEvents = ''
    canvas.lowerCanvasEl.style.pointerEvents = ''

    this.overlayMask.visible = false
    canvas.requestRenderAll()

    canvas.fire('editor:enabled')
    historyManager.resumeHistory()
  }
}
