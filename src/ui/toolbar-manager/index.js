import defaultConfig from './default-config'

export default class ToolbarManager {
  constructor(editor) {
    this.options = editor.options

    if (!this.options.showToolbar) return

    this.editor = editor
    this.canvas = editor.canvas

    const toolbarConfig = this.options.toolbar || {}

    this.config = {
      background: toolbarConfig.background || defaultConfig.background,
      actions: toolbarConfig.actions ?? defaultConfig.actions,

      style: {
        ...defaultConfig.style,
        ...toolbarConfig.style || {}
      },

      icons: {
        ...defaultConfig.icons,
        ...toolbarConfig.icons || {}
      },

      handlers: {
        ...defaultConfig.handlers,
        ...toolbarConfig.handlers || {}
      }
    }

    this._createDOM()
    this._bindEvents()
  }

  /**
   * Создаёт DOM элемент панели инструментов и добавляет его в canvas
   * @private
   */
  _createDOM() {
    const { style, actions, icons, handlers } = this.config

    this.el = document.createElement('div')

    Object.assign(this.el.style, style)

    actions.forEach((name) => {
      const btn = document.createElement('button')
      btn.innerHTML = icons[name] || name
      btn.onclick = () => handlers[name]?.(this.editor)
      this.el.appendChild(btn)
    })

    this.canvas.wrapperEl.appendChild(this.el)
  }

  /**
   * Привязывает события к canvas
   * @private
   */
  _bindEvents() {
    const upd = () => this._updatePos()
    this.canvas.on('selection:created', upd)
    this.canvas.on('selection:updated', upd)
    this.canvas.on('selection:changed', upd)
    this.canvas.on('object:modified', upd)
    this.canvas.on('after:render', upd)

    this.canvas.on('selection:cleared', () => { this.el.style.display = 'none' })
  }

  /**
   * Обновляет позицию панели инструментов в зависимости от положения выделенного объекта
   * @private
   */
  _updatePos() {
    const obj = this.canvas.getActiveObject()
    if (!obj) { this.el.style.display = 'none'; return }

    const zoom = this.canvas.getZoom()
    const [, , , , panX, panY] = this.canvas.viewportTransform
    const ctr = obj.getCenterPoint()
    const halfH = obj.getScaledHeight() / 2

    const left = ctr.x * zoom + panX - this.el.offsetWidth / 2
    const top = (ctr.y + halfH) * zoom + panY + 8

    this.el.style.left = `${left}px`
    this.el.style.top = `${top}px`
    this.el.style.display = 'flex'
  }
}
