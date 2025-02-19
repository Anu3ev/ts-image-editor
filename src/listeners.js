// TODO: Удаление объекта по нажатию на Delete
// TODO: Отмена действия по нажатию на Ctrl+Z
// TODO: Повтор действия по нажатию на Ctrl+Y
// TODO: Дефолтный скейлинг

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
      pasteImageFromClipboard
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

    this.initHistoryStateListeners()
  }

  initHistoryStateListeners() {
    // Сохраняем состояние при изменении объектов.
    // Используем debounce для уменьшения количества сохранений.
    this.canvas.on('object:modified', this.editor.debounce(() => {
      console.log('object:modified')
      this.editor.saveState()
    }, 300))

    this.canvas.on('object:rotating', this.editor.debounce(() => {
      console.log('object:rotating')
      this.editor.saveState()
    }, 300))

    // Сохраняем состояние при добавлении объекта.
    this.canvas.on('object:added', (e) => {
      if (this.editor.isLoading) return

      console.log('object:added')
      // Исключаем добавление объекта в процессе загрузки состояния
      this.editor.saveState()
    })

    // Если требуется, можно также отслеживать удаление объектов:
    this.canvas.on('object:removed', () => {
      if (this.editor.isLoading) return

      console.log('object:removed')
      this.editor.saveState()
    })
  }

  /**
   * Включает копирование объектов сочетанием клавиш.
   * При нажатии Ctrl+C копирует выделенные объекты.
   */
  enableCopyObjectsByHotkey() {
    document.addEventListener('keydown', this.handleCopyEvent.bind(this))
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
    document.addEventListener('paste', this.handlePasteEvent.bind(this))
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

      if (img && img.src) {
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
    this.canvas.on('mouse:down', this.handleCanvasDragStart.bind(this))
    this.canvas.on('mouse:move', this.handleCanvasDragging.bind(this))
    this.canvas.on('mouse:up', this.handleCanvasDragEnd.bind(this))
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
    this.canvas.on('mouse:wheel', this.handleMouseWheelZoom.bind(this))
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
   * Регистрирует обработчик, который при клике на объект поднимает его на передний план.
   */
  enableBringToFrontOnSelection() {
    this.canvas.on('mouse:down', this.handleObjectSelection.bind(this))
  }

  /**
   * Обработчик выбора объекта.
   * @param {Object} options
   * @param {Object} options.target — выбранный объект
   */
  handleObjectSelection({ target }) {
    if (this.canvas.isDragging) return
    if (!target) return

    this.editor.bringToFront(target)
  }
}

export default Listeners
