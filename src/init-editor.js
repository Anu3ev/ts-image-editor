// TODO: Разобраться с типами и с тем как здесь всё должно работать
import { ImageEditor } from './editor';
import defaults from './defaults';
/**
 * Инициализирует редактор, создавая канвас внутри контейнера.
 *
 * @param {string} containerId — ID контейнера, в котором будут созданы оба канваса.
 * @param {Object} options — опции и настройки.
 */
export default function initEditor(containerId, options = {}) {
    const adjustedOptions = Object.assign(Object.assign({}, defaults), options);
    // Находим контейнер по ID.
    const container = document.getElementById(containerId);
    if (!container) {
        return Promise.reject(new Error(`Контейнер с ID "${containerId}" не найден.`));
    }
    // Создаём канвас
    const editorCanvas = document.createElement('canvas');
    editorCanvas.id = `${containerId}-canvas`;
    container.appendChild(editorCanvas);
    // Сохраняем контейнер в опциях
    adjustedOptions.editorContainer = container;
    return new Promise((resolve) => {
        adjustedOptions._onReadyCallback = resolve;
        const editorInstance = new ImageEditor(editorCanvas.id, adjustedOptions);
        window[containerId] = editorInstance;
    });
}
