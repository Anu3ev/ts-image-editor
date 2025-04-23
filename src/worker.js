/* eslint-disable no-restricted-globals */

self.onmessage = async(e) => {
  const { action, payload, requestId } = e.data

  try {
    switch (action) {
    case 'loadImage': {
      const resp = await fetch(payload.url, { mode: 'cors' })
      const blob = await resp.blob()
      const bitmap = await createImageBitmap(blob)

      const { width, height } = bitmap

      const offscreen = new OffscreenCanvas(width, height)
      offscreen.getContext('2d').drawImage(bitmap, 0, 0, width, height)

      // Конвертируем содержимое canvas в Blob и создаём объект URL
      const newBlob = await offscreen.convertToBlob()

      // Отправляем bitmap обратно и передаём его в списке transferables
      self.postMessage({ requestId, action, success: true, data: newBlob })
      break
    }

    case 'resizeImage': {
      const { dataURL, maxWidth, maxHeight, sizeType } = payload
      const imgBitmap = await createImageBitmap(await (await fetch(dataURL)).blob())

      // вычисляем новый размер
      let { width, height } = imgBitmap
      let ratio = Math.min(maxWidth / width, maxHeight / height)

      if (sizeType === 'min') {
        ratio = Math.max(maxWidth / width, maxHeight / height)
      }

      width = Math.floor(width * ratio)
      height = Math.floor(height * ratio)

      // рисуем изображение в offscreen
      const offscreen = new OffscreenCanvas(width, height)
      const ctx = offscreen.getContext('2d')
      ctx.drawImage(imgBitmap, 0, 0, width, height)

      // конвертим обратно в dataURL
      const resizedBlob = await offscreen.convertToBlob()

      self.postMessage({ requestId, action, success: true, data: resizedBlob })
      break
    }

    case 'toDataURL': {
      const { bitmap, format, quality, returnBlob } = payload
      const { width, height } = bitmap

      // рисуем изображение в offscreen
      const off = new OffscreenCanvas(bitmap.width, bitmap.height)
      const ctx = off.getContext('2d')
      ctx.drawImage(bitmap, 0, 0, width, height)

      // конвертируем в blob, а затем в dataURL
      const blob = await off.convertToBlob({ type: format, quality })

      if (returnBlob) {
        self.postMessage({ requestId, action, success: true, data: blob })
        break
      }

      const dataURL = await new Promise((res) => {
        const r = new FileReader()
        r.onload = () => res(r.result)
        r.readAsDataURL(blob)
      })

      self.postMessage({ requestId, action, success: true, data: dataURL })
      break
    }

    default:
      throw new Error(`Unknown action ${action}`)
    }
  } catch (err) {
    self.postMessage({ requestId, action, success: false, error: err.message })
  }
}
