import Editor from './editor'

export default function(canvasId, options = {}) {
  console.log('init-editor.js')
  // Инициализируем интанс редактора изображений
  window[canvasId] = new Editor(canvasId, options)
}
