class Listeners {
  /**
   * Конструктор принимает редактор и опции.
   * @param {Object} params
   * @param {ImageEditor} params.editor – редактор, содержащий canvas
   * @param {Object} params.options — настройки редактора (см. defaults.js)
   * @param {Boolean} [params.options.canvasDragging] — включить перетаскивание канваса
   * @param {Boolean} [params.options.mouseWheelZooming] — включить зум колесом мыши
   * @param {Boolean} [params.options.bringToFrontOnSelection] — поднимать объект на передний план при выборе
   * @param {Boolean} [params.options.copyObjectsByHotkey] — копировать объекты по Ctrl+C
   * @param {Boolean} [params.options.pasteImageFromClipboard] — вставлять изображения и объекты из буфера обмена
   * @param {Boolean} [params.options.undoRedoByHotKeys] — отмена/повтор по Ctrl+Z/Ctrl+Y
   * @param {Boolean} [params.options.selectAllByHotkey] — выделение всех объектов по Ctrl+A
   * @param {Boolean} [params.options.deleteObjectsByHotkey] — удаление объектов по Delete
   * @param {Boolean} [params.options.resetObjectFitByDoubleClick] — сброс фита объекта по двойному клику
   */
  constructor({ editor, options = {} }) {
    this.editor = editor
    this.canvas = editor.canvas
    this.options = options

    this.isUndoRedoKeyPressed = false

    // Создаем и сохраняем привязанные обработчики, чтобы потом можно было их снять.
    // Глобальные (DOM) события:
    this.handleCopyEventBound = this.handleCopyEvent.bind(this)
    this.handlePasteEventBound = this.handlePasteEvent.bind(this)
    this.handleUndoRedoEventBound = this.handleUndoRedoEvent.bind(this)
    this.handleUndoRedoKeyUpBound = this.handleUndoRedoKeyUp.bind(this)
    this.handleSelectAllEventBound = this.handleSelectAllEvent.bind(this)
    this.handleDeleteObjectsEventBound = this.handleDeleteObjectsEvent.bind(this)

    // Canvas (Fabric) события:
    this.handleCanvasDragStartBound = this.handleCanvasDragStart.bind(this)
    this.handleCanvasDraggingBound = this.handleCanvasDragging.bind(this)
    this.handleCanvasDragEndBound = this.handleCanvasDragEnd.bind(this)
    this.handleMouseWheelZoomBound = this.handleMouseWheelZoom.bind(this)
    this.handleBringToFrontBound = this.handleBringToFront.bind(this)
    this.handleResetObjectFitBound = this.handleResetObjectFit.bind(this)

    this.init()
  }

  /**
   * Инициализация всех обработчиков согласно опциям.
   */
  init() {
    const {
      canvasDragging,
      mouseWheelZooming,
      bringToFrontOnSelection,
      copyObjectsByHotkey,
      pasteImageFromClipboard,
      undoRedoByHotKeys,
      selectAllByHotkey,
      deleteObjectsByHotkey,
      resetObjectFitByDoubleClick
    } = this.options

    // Подключаем Fabric-события для перетаскивания канваса, если включено
    if (canvasDragging) {
      this.canvas.on('mouse:down', this.handleCanvasDragStartBound)
      this.canvas.on('mouse:move', this.handleCanvasDraggingBound)
      this.canvas.on('mouse:up', this.handleCanvasDragEndBound)
    }

    // Зум колесом мыши
    if (mouseWheelZooming) {
      this.canvas.on('mouse:wheel', this.handleMouseWheelZoomBound)
    }

    // bringToFront при выборе объекта
    if (bringToFrontOnSelection) {
      this.canvas.on('selection:created', this.handleBringToFrontBound)
      this.canvas.on('selection:updated', this.handleBringToFrontBound)
    }

    if (resetObjectFitByDoubleClick) {
      this.canvas.on('mouse:dblclick', this.handleResetObjectFitBound)
    }

    // Подключаем глобальные DOM-события:
    // Копирование объектов сочетанием клавиш
    if (copyObjectsByHotkey) {
      document.addEventListener('keydown', this.handleCopyEventBound, { capture: true })
    }

    if (pasteImageFromClipboard) {
      document.addEventListener('paste', this.handlePasteEventBound, { capture: true })
    }

    if (undoRedoByHotKeys) {
      document.addEventListener('keydown', this.handleUndoRedoEventBound, { capture: true })

      document.addEventListener('keyup', this.handleUndoRedoKeyUpBound, { capture: true })
    }

    if (selectAllByHotkey) {
      document.addEventListener('keydown', this.handleSelectAllEventBound, { capture: true })
    }

    if (deleteObjectsByHotkey) {
      document.addEventListener('keydown', this.handleDeleteObjectsEventBound, { capture: true })
    }

    // Инициализация истории редактора
    this.initHistoryStateListeners()
  }

  /**
   * Инициализация событий для сохранения истории (используя debounce).
   */
  initHistoryStateListeners() {
    // Сохраняем состояние при добавлении, изменении, удалении объектов.
    // Используем debounce для уменьшения количества сохранений.
    this.canvas.on('object:modified', this.editor.debounce(() => {
      if (this.editor.skipHistory) return

      this.editor.saveState()
    }, 300))

    this.canvas.on('object:rotating', this.editor.debounce(() => {
      if (this.editor.skipHistory) return

      this.editor.saveState()
    }, 300))

    this.canvas.on('object:added', () => {
      if (this.editor.skipHistory || this.editor.isLoading) return

      this.editor.saveState()
    })

    this.canvas.on('object:removed', () => {
      if (this.editor.skipHistory || this.editor.isLoading) return

      this.editor.saveState()
    })
  }

  // --- Глобальные DOM-обработчики ---

  /**
   * Обработчик для Ctrl+C (копирование).
   * @param {Object} event — объект события
   * @param {Boolean} event.ctrlKey — зажата ли клавиша Ctrl
   * @param {Boolean} event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param {String} event.code — код клавиши
   */
  handleCopyEvent(event) {
    const { ctrlKey, metaKey, code } = event

    if ((!ctrlKey && !metaKey) || code !== 'KeyC') return

    event.preventDefault()
    this.editor.copy()
  }

  /**
   * Обработчик вставки объекта или изображения из буфера обмена.
   * @param {Object} event — объект события
   * @param {Object} event.clipboardData — данные из буфера обмена
   * @param {Array} event.clipboardData.items — элементы буфера обмена
   */
  handlePasteEvent({ clipboardData }) {
    if (!clipboardData?.items?.length) return

    const { items } = clipboardData
    const lastItem = items[items.length - 1]

    if (lastItem.type.indexOf('image') !== -1) {
      const blob = lastItem.getAsFile()
      if (!blob) return

      const reader = new FileReader()
      reader.onload = (f) => {
        this.editor.importImage({ url: f.target.result })
      }

      reader.readAsDataURL(blob)
      return
    }

    // Если прямого image нет, проверяем данные HTML
    const htmlData = clipboardData.getData('text/html')

    if (htmlData) {
      const parser = new DOMParser()
      const doc = parser.parseFromString(htmlData, 'text/html')
      const img = doc.querySelector('img')

      if (img?.src) {
        this.editor.importImage({ url: img.src })
        return
      }
    }

    this.editor.paste()
  }

  /**
   * Обработчик для отмены/повтора (Ctrl+Z/Ctrl+Y).
   *  @param {Object} event — объект события
   * @param {Boolean} event.ctrlKey — зажата ли клавиша Ctrl
   * @param {Boolean} event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param {String} event.code — код клавиши
   */
  async handleUndoRedoEvent(event) {
    const { ctrlKey, metaKey, code, repeat } = event

    if ((!ctrlKey && !metaKey) || repeat) return

    if (this.isUndoRedoKeyPressed) return

    if (code === 'KeyZ') {
      event.preventDefault()
      this.isUndoRedoKeyPressed = true
      await this.editor.undo()
    } else if (code === 'KeyY') {
      event.preventDefault()
      this.isUndoRedoKeyPressed = true
      await this.editor.redo()
    }
  }

  /**
   * Обработчик для отпускания клавиш Ctrl+Z/Ctrl+Y.
   * @param {Object} event — объект события
   * @param {String} event.code — код клавиши
   */
  handleUndoRedoKeyUp({ code }) {
    if (code === 'KeyZ' || code === 'KeyY') {
      this.isUndoRedoKeyPressed = false
    }
  }

  /**
   * Обработчик для выделения всех объектов (Ctrl+A).
   * @param {Object} event — объект события
   * @param {Boolean} event.ctrlKey — зажата ли клавиша Ctrl
   * @param {Boolean} event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param {String} event.code — код клавиши
   */
  handleSelectAllEvent(event) {
    const { ctrlKey, metaKey, code } = event
    if ((!ctrlKey && !metaKey) || code !== 'KeyA') return
    event.preventDefault()
    this.editor.selectAll()
  }

  /**
   * Обработчик для удаления объектов (Delete).
   * @param {Object} event — объект события
   * @param {String} event.code — код клавиши
   */
  handleDeleteObjectsEvent(event) {
    if (event.code !== 'Delete') return
    event.preventDefault()
    this.editor.deleteSelectedObjects()
  }

  // --- Обработчики для событий canvas (Fabric) ---

  /**
   * Начало перетаскивания канваса (срабатывает при mouse:down).
   * @param {Object} options
   * @param {Object} options.e — объект события
   */
  handleCanvasDragStart({ e: event }) {
    // перетаскивание происходит только при зажатом Alt
    if (!event.altKey) return
    this.canvas.isDragging = true
    this.canvas.selection = false
    this.canvas.lastPosX = event.clientX
    this.canvas.lastPosY = event.clientY
  }

  /**
   * Перетаскивание канваса (mouse:move).
   * @param {Object} options
   * @param {Object} options.e — объект события
   *
   * TODO: Надо как-то ограничить область перетаскивания, чтобы канвас не уходил сильно далеко за пределы экрана
   */
  handleCanvasDragging({ e: event }) {
    if (!this.canvas.isDragging) return
    const vpt = this.canvas.viewportTransform
    vpt[4] += event.clientX - this.canvas.lastPosX
    vpt[5] += event.clientY - this.canvas.lastPosY
    this.canvas.requestRenderAll()
    this.canvas.lastPosX = event.clientX
    this.canvas.lastPosY = event.clientY
  }

  /**
   * Завершение перетаскивания канваса (mouse:up).
   * Сохраняет новое положение канваса.
   */
  handleCanvasDragEnd() {
    this.canvas.setViewportTransform(this.canvas.viewportTransform)
    this.canvas.isDragging = false
    this.canvas.selection = true
  }

  /**
   * Обработчик зума колесиком мыши.
   * @param {Object} options
   * @param {Object} options.e — объект события
   */
  handleMouseWheelZoom({ e: event }) {
    const conversionFactor = 0.001
    const scaleAdjustment = -event.deltaY * conversionFactor

    this.editor.zoom(scaleAdjustment)

    event.preventDefault()
    event.stopPropagation()
  }

  /**
   * Обработчик, поднимающий выделенные объекты на передний план.
   * @param {Object} event - объект события Fabric
   * @param {Array} event.selected - массив выбранных объектов
   */
  handleBringToFront({ selected }) {
    console.log('handleBringToFront')
    if (!selected?.length) return
    selected.forEach((obj) => {
      this.editor.bringToFront(obj)
    })
  }

  /**
   * Обработчик сброса объекта по двойному клику.
   */
  handleResetObjectFit({ target }) {
    if (!target) return
    this.editor.resetObject(target)
  }

  /**
   * Метод для удаления всех слушателей
   */
  destroy() {
    // Глобальные DOM-обработчики
    document.removeEventListener('keydown', this.handleCopyEventBound, { capture: true })
    document.removeEventListener('paste', this.handlePasteEventBound, { capture: true })
    document.removeEventListener('keydown', this.handleUndoRedoEventBound, { capture: true })
    document.removeEventListener('keyup', this.handleUndoRedoKeyUpBound, { capture: true })
    document.removeEventListener('keydown', this.handleSelectAllEventBound, { capture: true })
    document.removeEventListener('keydown', this.handleDeleteObjectsEventBound, { capture: true })

    // Обработчики canvas (Fabric):
    if (this.options.canvasDragging) {
      this.canvas.off('mouse:down', this.handleCanvasDragStartBound)
      this.canvas.off('mouse:move', this.handleCanvasDraggingBound)
      this.canvas.off('mouse:up', this.handleCanvasDragEndBound)
    }
    if (this.options.mouseWheelZooming) {
      this.canvas.off('mouse:wheel', this.handleMouseWheelZoomBound)
    }
    if (this.options.bringToFrontOnSelection) {
      this.canvas.off('selection:created', this.handleBringToFrontBound)
      this.canvas.off('selection:updated', this.handleBringToFrontBound)
    }
    if (this.options.resetObjectFitByDoubleClick) {
      this.canvas.off('mouse:dblclick', this.handleResetObjectFitBound)
    }
  }
}

export default Listeners
