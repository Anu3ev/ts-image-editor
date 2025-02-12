import Editor from './editor'
import { createCanvasElement } from './canvasCreator';

export default function(canvasId, options = {}) {
  createCanvasElement(canvasId, options)

  // Инициализируем интанс редактора изображений
  window[canvasId] = new Editor(canvasId, options)
}
