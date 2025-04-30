import defaultConfig from './default-config'

export default class ToolbarManager {
  constructor(editor) {
    this.options = editor.options

    if (!this.options.showToolbar) return

    this.editor = editor
    this.canvas = editor.canvas

    const toolbarConfig = this.options.toolbar || {}

    this.config = {
      ...defaultConfig,
      ...toolbarConfig,

      style: {
        ...defaultConfig.style,
        ...toolbarConfig.style || {}
      },

      btnStyle: {
        ...defaultConfig.btnStyle,
        ...toolbarConfig.btnStyle || {}
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

    this.currentTarget = null
    this.currentLocked = null
    this.isTransforming = false

    this._createDOM()
    this._bindEvents()
  }

  /**
   * Создаёт DOM элемент панели инструментов и добавляет его в canvas
   * @private
   */
  _createDOM() {
    const { style } = this.config

    this.el = document.createElement('div')

    Object.assign(this.el.style, style)
    this.canvas.wrapperEl.appendChild(this.el)
  }

  _renderButtons(names) {
    this.el.innerHTML = ''
    for (const name of names) {
      const btn = document.createElement('button')

      btn.innerHTML = this.config.icons[name] ? `<img src="${this.config.icons[name]}" />` : name

      Object.assign(btn.style, this.config.btnStyle)

      btn.addEventListener('mouseenter', () => {
        Object.assign(btn.style, this.config.btnHover)
      })
      btn.addEventListener('mouseleave', () => {
        Object.assign(btn.style, this.config.btnStyle)
      })

      btn.onclick = () => this.config.handlers[name]?.(this.editor)
      this.el.appendChild(btn)
    }
  }

  /**
   * Привязывает события к canvas
   * @private
   */
  _bindEvents() {
    // На время трансформации скрываем тулбар
    this.canvas.on('mouse:down', (opt) => {
      if (opt.transform?.actionPerformed) {
        this._startTransform()
      }
    })

    this.canvas.on('object:moving', () => this._startTransform())
    this.canvas.on('object:scaling', () => this._startTransform())
    this.canvas.on('object:rotating', () => this._startTransform())

    // При завершении трансформации показываем тулбар и обновляем его позицию
    this.canvas.on('mouse:up', () => this._endTransform())
    this.canvas.on('object:modified', () => this._endTransform())

    // При изменении выделения обновляем позицию тулбара
    const upd = () => this._updateToolbar()
    this.canvas.on('selection:created', upd)
    this.canvas.on('selection:updated', upd)
    this.canvas.on('selection:changed', upd)
    this.canvas.on('object:modified', upd)
    this.canvas.on('after:render', upd)

    // Если выделение снято, скрываем тулбар
    this.canvas.on('selection:cleared', () => { this.el.style.display = 'none' })
  }

  /**
   * Начало трансформации объекта
   * @private
   */
  _startTransform() {
    this.isTransforming = true
    this.el.style.display = 'none'
  }

  /**
   * Завершение трансформации объекта
   * @private
   */
  _endTransform() {
    this.isTransforming = false
    this._updatePos()
  }

  /**
   * Обновляет панель инструментов в зависимости от выделенного объекта и его состояния
   * @private
   */
  _updateToolbar() {
    if (this.isTransforming) return

    const obj = this.canvas.getActiveObject()
    if (!obj) {
      this.el.style.display = 'none'
      this.currentTarget = null
      return
    }

    const locked = Boolean(obj.locked)

    // Если объект или его флаг locked изменились — перерисовываем кнопки
    if (obj !== this.currentTarget || locked !== this.currentLocked) {
      this.currentTarget = obj
      this.currentLocked = locked
      const names = locked
        ? this.config.lockedActions
        : this.config.actions
      this._renderButtons(names)
    }

    this._updatePos()
  }

  /**
   * Обновляет позицию панели инструментов в зависимости от положения выделенного объекта
   * @private
   */
  _updatePos() {
    if (this.isTransforming) return

    const obj = this.canvas.getActiveObject()

    if (!obj) {
      this.el.style.display = 'none'
      return
    }

    const { el, config, canvas } = this

    // Пересчитываем внутренние координаты объекта (для корректного getBoundingRect)
    obj.setCoords()

    // Читаем текущий зум (масштаб) и сдвиг (панорамирование) холста
    const zoom = canvas.getZoom()

    // viewportTransform — [scaleX, skewX, skewY, scaleY, translateX, translateY]
    const [, , , , panX, panY] = canvas.viewportTransform

    // Находим центр объекта в исходных canvas-координатах
    const { x: centerX } = obj.getCenterPoint()

    // Получаем axis-aligned bounding-box объекта (с учётом поворота)
    //    первый аргумент false — не включаем масштаб в результат,
    //    второй true — учитываем текущий трансформ (rotate/scale)
    const { top: objectTop, height: objectHeight } = obj.getBoundingRect(false, true)

    // Вычисляем экранную X-координату центра объекта
    const screenCenterX = centerX * zoom + panX

    // Смещаем тулбар по горизонтали так, чтобы он был строго по центру снизу
    const left = screenCenterX - el.offsetWidth / 2

    // Получаем нижнюю грань объекта в пикселях с учётом угла поворота + отступ
    const top = (objectTop + objectHeight) * zoom + panY + config.offsetTop

    Object.assign(el.style, {
      left: `${left}px`,
      top: `${top}px`,
      display: 'flex'
    })
  }

  /**
   * Удаляет слушатели событий и DOM элемент панели инструментов
   */
  destroy() {
    this.canvas.off('mouse:down')
    this.canvas.off('mouse:up')
    this.canvas.off('object:moving')
    this.canvas.off('object:scaling')
    this.canvas.off('object:rotating')
    this.canvas.off('object:modified')
    this.canvas.off('selection:created')
    this.canvas.off('selection:updated')
    this.canvas.off('selection:changed')
    this.canvas.off('after:render')
    this.canvas.off('selection:cleared')

    this.el.remove()
  }
}
