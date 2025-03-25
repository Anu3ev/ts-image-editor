class Listeners {
  /**
   * @param {Object} params
   * @param {ImageEditor} params.editor — редактор, содержащий канвас
   * @param {Object} params.options — настройки редактора (см. defaults.js)
   * @param {Boolean} [params.options.canvasDragging] — включить перетаскивание канваса
   * @param {Boolean} [params.options.mouseWheelZooming] — включить зум колесом мыши
   * @param {Boolean} [params.options.bringToFrontOnSelection] — поднимать объект на передний план при выборе
   */
  constructor({ editor, options = {} }) {
    this.editor = editor
    this.canvas = editor.canvas
    this.options = options

    this.init()
  }

  /**
   * Инициализация всех обработчиков.
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

    // Перетаскивание канваса
    if (canvasDragging) {
      this.enableCanvasDragging()
    }

    // Зум колесом мыши
    if (mouseWheelZooming) {
      this.enableMouseWheelZooming()
    }

    // bringToFront при выборе объекта
    if (bringToFrontOnSelection) {
      this.enableBringToFrontOnSelection()
    }

    // Копирование объектов сочетанием клавиш
    if (copyObjectsByHotkey) {
      this.enableCopyObjectsByHotkey()
    }

    // Вставка изображения из буфера обмена сочетанием клавиш
    if (pasteImageFromClipboard) {
      this.enablePasteImageFromClipboard()
    }

    // Отмена и повтор действий сочетанием клавиш
    if (undoRedoByHotKeys) {
      this.enableUndoRedoByHotKeys()
    }

    // Выделение всех объектов сочетанием клавиш
    if (selectAllByHotkey) {
      this.enableSelectAllByHotkey()
    }

    // Удаление объекта сочетанием клавиш
    if (deleteObjectsByHotkey) {
      this.enableDeleteObjectsByHotkey()
    }

    // Сброс объекта по двойному клику
    if (resetObjectFitByDoubleClick) {
      this.enableResetObjectFitByDoubleClick()
    }

    this.initHistoryStateListeners()
  }

  initHistoryStateListeners() {
    // Сохраняем состояние при добавлении, изменении, удалении объектов.
    // Используем debounce для уменьшения количества сохранений.
    this.canvas.on('object:modified', this.editor.debounce(() => {
      if (this.editor.skipHistory) return

      console.log('object:modified')
      this.editor.saveState()
    }, 300))

    this.canvas.on('object:rotating', this.editor.debounce(() => {
      if (this.editor.skipHistory) return

      console.log('object:rotating')
      this.editor.saveState()
    }, 300))

    this.canvas.on('object:added', () => {
      if (this.editor.skipHistory) return

      if (this.editor.isLoading) return

      console.log('object:added')
      this.editor.saveState()
    })

    this.canvas.on('object:removed', () => {
      if (this.editor.skipHistory || this.editor.isLoading) return

      console.log('object:removed')
      this.editor.saveState()
    })
  }

  /**
   * Включает копирование объектов сочетанием клавиш.
   * При нажатии Ctrl+C копирует выделенные объекты.
   */
  enableCopyObjectsByHotkey() {
    document.addEventListener('keydown', (event) => this.handleCopyEvent(event))
  }

  /**
   * Обработчик копирования объектов.
   * @param {Object} event — объект события
   * @param {Boolean} event.ctrlKey — зажата ли клавиша Ctrl
   * @param {Boolean} event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param {String} event.code — код клавиши
   */
  handleCopyEvent(event) {
    const { ctrlKey, metaKey, code } = event

    // Для Mac можно проверять event.metaKey вместо event.ctrlKey
    if ((!ctrlKey && !metaKey) || code !== 'KeyC') return

    event.preventDefault()
    this.editor.copy()
  }

  /**
   * Включает вставку изображений и объектов сочетанием клавиш.
   */
  enablePasteImageFromClipboard() {
    document.addEventListener('paste', (event) => this.handlePasteEvent(event))
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
   * Включает перетаскивание канваса (drag) при зажатом Alt.
   */
  enableCanvasDragging() {
    this.canvas.on('mouse:down', (event) => this.handleCanvasDragStart(event))
    this.canvas.on('mouse:move', (event) => this.handleCanvasDragging(event))
    this.canvas.on('mouse:up', () => this.handleCanvasDragEnd())
  }

  /**
   * Обработчик начала перетаскивания канваса.
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
   * Обработчик перетаскивания канваса.
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
   * Обработчик завершения перетаскивания канваса.
   * Сохраняет новое положение канваса.
   */
  handleCanvasDragEnd() {
    this.canvas.setViewportTransform(this.canvas.viewportTransform)
    this.canvas.isDragging = false
    this.canvas.selection = true
  }

  /**
   * Включает зум канваса при прокрутке колесика мыши.
   */
  enableMouseWheelZooming() {
    this.canvas.on('mouse:wheel', (event) => this.handleMouseWheelZoom(event))
  }

  /**
   * Обработчик зума колесиком мыши.
   * @param {Object} options
   * @param {Object} options.e — объект события
   */
  handleMouseWheelZoom({ e: event }) {
    const conversionFactor = 0.001 // подберите оптимальное значение по опыту
    const scaleAdjustment = -event.deltaY * conversionFactor

    // Вызываем ваш метод zoom, который уже реализует логику добавления к текущему зуму и центрирования
    this.editor.zoom(scaleAdjustment)

    event.preventDefault()
    event.stopPropagation()
  }

  /**
   * Включает перемещение объекта на передний план при его выделении.
   */
  enableBringToFrontOnSelection() {
    this.canvas.on('selection:created', (event) => this.handleBringToFront(event))
    this.canvas.on('selection:updated', (event) => this.handleBringToFront(event))
  }

  /**
   * Обработчик перемещения выделенного объекта на передний план.
   * @param {Object} event - объект события Fabric
   */
  handleBringToFront({ selected }) {
    if (!selected?.length) return

    selected.forEach((obj) => {
      this.editor.bringToFront(obj)
    })
  }

  /**
 * Включает отмену и повтор действий сочетанием клавиш.
 * При нажатии Ctrl+Z отменяет последнее действие.
 * При нажатии Ctrl+Y повторяет последнее отмененное действие.
 */
  enableUndoRedoByHotKeys() {
    document.addEventListener('keydown', (event) => this.handleUndoRedoEvent(event))
  }

  /**
   * Обработчик отмены и повтора действий.
   * @param {Object} event — объект события
   * @param {Boolean} event.ctrlKey — зажата ли клавиша Ctrl
   * @param {Boolean} event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param {String} event.code — код клавиши
   */
  handleUndoRedoEvent(event) {
    const { ctrlKey, metaKey, code } = event

    // Для Mac можно проверять event.metaKey вместо event.ctrlKey
    if (!ctrlKey && !metaKey) return

    if (code === 'KeyZ') {
      event.preventDefault()
      this.editor.undo()
      return
    }

    if (code === 'KeyY') {
      event.preventDefault()
      this.editor.redo()
    }
  }

  /**
   * Включает выделение всех объектов сочетанием клавиш.
   * При нажатии Ctrl+A выделяет все объекты на канвасе.
   */
  enableSelectAllByHotkey() {
    document.addEventListener('keydown', (event) => this.handleSelectAllEvent(event))
  }

  /**
   * Обработчик выделения всех объектов.
   * @param {Object} event — объект события
   * @param {Boolean} event.ctrlKey — зажата ли клавиша Ctrl
   * @param {Boolean} event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param {String} event.code — код клавиши
   */
  handleSelectAllEvent(event) {
    const { ctrlKey, metaKey, code } = event

    // Для Mac можно проверять event.metaKey вместо event.ctrlKey
    if ((!ctrlKey && !metaKey) || code !== 'KeyA') return

    event.preventDefault()
    this.editor.selectAll()
  }

  /**
   * Включает удаление объектов сочетанием клавиш.
   * При нажатии Delete удаляет все выделенные объекты.
   */
  enableDeleteObjectsByHotkey() {
    document.addEventListener('keydown', (event) => this.handleDeleteObjectsEvent(event))
  }

  /**
   * Обработчик удаления объектов.
   * @param {Object} event — объект события
   * @param {String} event.code — код клавиши
   */
  handleDeleteObjectsEvent(event) {
    if (event.code !== 'Delete') return

    event.preventDefault()
    this.editor.deleteSelectedObjects()
  }

  /**
   * Включает сброс объекта по двойному клику.
   */
  enableResetObjectFitByDoubleClick() {
    this.canvas.on('mouse:dblclick', (event) => this.handleResetObjectFit(event))
  }

  /**
   * Обработчик сброса объекта по двойному клику.
   * @param {Object} options
   * @param {Object} options.target — объект, на который был произведен двойной клик
   */
  handleResetObjectFit({ target }) {
    if (!target) return

    this.editor.resetObject(target)
  }
}

export default Listeners
