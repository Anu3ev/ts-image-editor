export default class ModuleLoader {
  /**
   * @description Класс для динамической загрузки внешних модулей.
   */
  constructor() {
    this.cache = new Map()
    this.loaders = {
      jspdf: () => import('jspdf')
    }
  }

  /**
   * Загружает модуль по имени и сохраняет промис в кеше.
   * @param {string} name — строковый литерал, например 'fabric' или '../helpers'
   * @returns {Promise<Module>} — namespace-объект ES-модуля
   */
  loadModule(name) {
    if (!this.loaders[name]) {
      return Promise.reject(new Error(`Unknown module "${name}"`))
    }
    if (!this.cache.has(name)) {
      this.cache.set(name, this.loaders[name]())
    }
    return this.cache.get(name)
  }
}
