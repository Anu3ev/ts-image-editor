// API Docs: https://fabricjs.com/api/classes/canvas/

export default {
  // Canvas backstore width and height
  backstoreWidth: 512,
  backstoreHeight: 512,
  // Canvas (upper & lower) CSS width and height
  canvasDisplayWidth: '100%',
  canvasDisplayHeight: '100%',
  // Wrapper CSS width and height
  canvasWrapperWidth: '100%',
  canvasWrapperHeight: '100%',
  // Container CSS width and height
  editorContainerWidth: 'fit-content',
  editorContainerHeight: '100%',
  // Cохраняют ли объекты свой текущий порядок (z-index) при выделении
  preserveObjectStacking: true,
  // Возможность взаимодействия с объектом за пределами монтажной области
  controlsAboveOverlay: true,
  // Зум по центру
  centeredScaling: true,
  // Поворот объекта по центру
  centeredRotation: true,

  /*
  * Кастомные опции
  */

  // Дефолтный тип скейлинга для объектов (cotain/cover)
  scaleType: 'contain',

  // Можно передать JSON объект в виде строки для инициализации редактора
  initialStateJSON: null,

  /*
  * Объект изображения с которым редактор будет инициализирован. Может содержать:
  *  - {String} url - URL изображения (обязательный)
  *  - {String} scaleType - Тип скейлинга (contain/cover/scale-canvas)
  *  - {Boolean} withoutSave - Не сохранять состояние редактора (по умолчанию false)
  */
  initialImage: null,

  // Дефолтный масштаб
  defaultScale: 0.7,
  // Поднимать объект на передний план по оси Z при выделении
  bringToFrontOnSelection: false,
  // Зум по колесику мыши
  mouseWheelZooming: true,
  // Перемещение канваса при зажатой кнопке ALT
  canvasDragging: false,
  // Копирование объектов (Ctrl + C, Ctrl + V)
  copyObjectsByHotkey: true,
  // Вставка изображения из буфера обмена
  pasteImageFromClipboard: true,
  // Отмена/повтор действия по сочетанию клавиш (Ctrl + Z, Ctrl + Y)
  undoRedoByHotKeys: true,
  // Выделение всех объектов по сочетанию клавиш (Ctrl + A)
  selectAllByHotkey: true,
  // Удаление объектов по сочетанию клавиш (Delete)
  deleteObjectsByHotkey: true,
  // Сброс параметров объекта по двойному клику
  resetObjectFitByDoubleClick: true
}
