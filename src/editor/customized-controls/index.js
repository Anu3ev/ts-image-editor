import { InteractiveFabricObject, controlsUtils } from 'fabric'
import { DEFAULT_CONTROLS } from './default-controls'

export default class ControlsCustomizer {
  static apply() {
    const ctrls = controlsUtils.createObjectDefaultControls()
    Object.entries(DEFAULT_CONTROLS).forEach(([key, cfg]) => {
      Object.assign(ctrls[key], {
        render: cfg.render,
        sizeX: cfg.sizeX,
        sizeY: cfg.sizeY,
        offsetX: cfg.offsetX,
        offsetY: cfg.offsetY
      })
    })

    InteractiveFabricObject.ownDefaults.controls = ctrls
  }
}
