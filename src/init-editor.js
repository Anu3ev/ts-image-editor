import Editor from './editor'
import defaults from './defaults'

/**
 * Инициализирует редактор, создавая канвас внутри контейнера.
 *
 * @param {string} containerId — ID контейнера, в котором будут созданы оба канваса.
 * @param {Object} options — опции и настройки.
 */
export default function initEditor(containerId, options = {}) {
  const adjustedOptions = { ...defaults, ...options }

  // Находим контейнер по ID.
  const container = document.getElementById(containerId)
  if (!container) {
    console.error(`Контейнер с ID "${containerId}" не найден.`)
    return
  }

  container.style.width = adjustedOptions.displayWidth
  container.style.height = adjustedOptions.displayHeight

  // Создаём монтажную область
  const editorCanvas = document.createElement('canvas')
  editorCanvas.id = `${containerId}-canvas`
  container.appendChild(editorCanvas)

  // Сохраняем контейнер в опциях
  adjustedOptions.editorContainer = container

  window[containerId] = new Editor(editorCanvas.id, adjustedOptions)
}
