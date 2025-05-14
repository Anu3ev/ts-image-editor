import { nanoid } from 'nanoid'

export default class WorkerManager {
  /**
   * @param {string|URL} [scriptUrl] — URL скрипта воркера.
   * По-умолчанию использует файл рядом с этим модулем
   */
  constructor(scriptUrl = new URL('./worker.js', import.meta.url)) {
    this.worker = new Worker(scriptUrl, { type: 'module' })
    this._callbacks = new Map()
    this.worker.onmessage = this._handleMessage.bind(this)
  }

  /**
   * Обработчик сообщений от воркера
   * @param {Object} data
   * @param {String} data.action - название действия
   * @param {String} data.requestId - уникальный идентификатор запроса
   * @param {Boolean} data.success - успешность выполнения действия
   * @param {Object} data.data - данные, которые вернул воркер
   * @param {String} data.error - ошибка, если она произошла
   * @returns {void}
   */
  _handleMessage({ data }) {
    const { requestId, success, data: payload, error } = data
    const cb = this._callbacks.get(requestId)
    if (!cb) return

    if (success) {
      cb.resolve(payload)
    } else {
      cb.reject(new Error(error))
    }

    this._callbacks.delete(requestId)
  }

  /**
   * Универсальный метод отправки команды в воркер
   * @param {String} action
   * @param {Object} payload
   * @param {Array} [transferables] - массив объектов, которые нужно передать в воркер
   * @returns {Promise<any>}
   */
  post(action, payload, transferables = []) {
    const requestId = `${action}:${nanoid(8)}`

    return new Promise((resolve, reject) => {
      this._callbacks.set(requestId, { resolve, reject })
      this.worker.postMessage({ action, payload, requestId }, transferables)
    })
  }

  /**
   * Завершает работу воркера
   */
  terminate() {
    this.worker.terminate()
  }
}
