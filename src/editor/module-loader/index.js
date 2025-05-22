export default class ModuleLoader {
  constructor() {
    this.cache = new Map()
    this.loaders = {
      fabric: () => import('fabric'),
      jspdf:  () => import('jspdf'),
      nanoid: () => import('nanoid')
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
