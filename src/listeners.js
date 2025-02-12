// TODO: Удаление объекта по нажатию на Delete
// TODO: Копирование объекта по нажатию на Ctrl+C
// TODO: Вставка объекта по нажатию на Ctrl+V
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
    const { canvasDragging, mouseWheelZooming, bringToFrontOnSelection } = this.options

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
