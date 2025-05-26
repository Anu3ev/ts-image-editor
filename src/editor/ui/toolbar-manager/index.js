import defaultConfig from './default-config'

export default class ToolbarManager {
  /**
   * @param {object} options
   * @param {object} options.editor - экземпляр редактора с доступом к canvas
   */
  constructor({ editor }) {
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

    this._onMouseDown = this._handleMouseDown.bind(this)
    this._onObjectMoving = this._startTransform.bind(this)
    this._onObjectScaling = this._startTransform.bind(this)
    this._onObjectRotating = this._startTransform.bind(this)
    this._onMouseUp = this._endTransform.bind(this)
    this._onObjectModified = this._endTransform.bind(this)
    this._onSelectionChange = this._updateToolbar.bind(this)
    this._onSelectionClear = () => { this.el.style.display = 'none' }

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

    this._onBtnOver = (e) => {
      const btn = e.target.closest('button')
      if (!btn) return
      Object.assign(btn.style, this.config.btnHover)
    }
    this._onBtnOut = (e) => {
      const btn = e.target.closest('button')
      if (!btn) return
      Object.assign(btn.style, this.config.btnStyle)
    }
    this.el.addEventListener('mouseover', this._onBtnOver)
    this.el.addEventListener('mouseout', this._onBtnOut)
  }

  /**
   * Отрисовывает кнопки панели инструментов
   * @private
   * @param {array} actions - массив действий для отрисовки
   * @param {string} actions[].name - название действия
   * @param {string} actions[].handle - название обработчика
   */
  _renderButtons(actions) {
    this.el.innerHTML = ''
    for (const action of actions) {
      const { name, handle } = action
      const { icons, btnStyle, handlers } = this.config

      const btn = document.createElement('button')

      btn.innerHTML = icons[handle] ? `<img src="${icons[handle]}" title="${name}" />` : name

      Object.assign(btn.style, btnStyle)

      btn.onclick = () => handlers[handle]?.(this.editor)
      this.el.appendChild(btn)
    }
  }

  /**
   * Привязывает события к canvas
   * @private
   */
  _bindEvents() {
    // На время трансформации скрываем тулбар
    this.canvas.on('mouse:down', this._onMouseDown)
    this.canvas.on('object:moving', this._onObjectMoving)
    this.canvas.on('object:scaling', this._onObjectScaling)
    this.canvas.on('object:rotating', this._onObjectRotating)

    this.canvas.on('mouse:up', this._onMouseUp)
    this.canvas.on('object:modified', this._onObjectModified)

    // 2) выделение / рендер
    this.canvas.on('selection:created', this._onSelectionChange)
    this.canvas.on('selection:updated', this._onSelectionChange)
    this.canvas.on('selection:changed', this._onSelectionChange)
    this.canvas.on('after:render', this._onSelectionChange)

    this.canvas.on('selection:cleared', this._onSelectionClear)
  }

  /**
   * На время трансформации скрываем тулбар
   * @private
   * @param {Object} opt - объект события
   */
  _handleMouseDown(opt) {
    if (opt.transform?.actionPerformed) {
      this._startTransform()
    }
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
      const actions = locked
        ? this.config.lockedActions
        : this.config.actions

      this._renderButtons(actions)
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
    this.el.removeEventListener('mouseover', this._onBtnOver)
    this.el.removeEventListener('mouseout', this._onBtnOut)

    this.canvas.off('mouse:down', this._onMouseDown)
    this.canvas.off('object:moving', this._onObjectMoving)
    this.canvas.off('object:scaling', this._onObjectScaling)
    this.canvas.off('object:rotating', this._onObjectRotating)

    this.canvas.off('mouse:up', this._onMouseUp)
    this.canvas.off('object:modified', this._onObjectModified)

    this.canvas.off('selection:created', this._onSelectionChange)
    this.canvas.off('selection:updated', this._onSelectionChange)
    this.canvas.off('selection:changed', this._onSelectionChange)
    this.canvas.off('after:render', this._onSelectionChange)

    this.canvas.off('selection:cleared', this._onSelectionClear)

    this.el.remove()
  }
}
