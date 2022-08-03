import Controls, { keyToControl, isControlKey } from './controls'

export default class Input {
  controls: Controls = {
    up: false,
    down: false,
    left: false,
    right: false,
    select: false
  }

  take ({ key, value }: {
    key: string
    value: boolean
  }): void {
    if (isControlKey(key)) {
      const control = keyToControl[key]

      this.controls[control] = value
    } else {
      console.warn('Uncontrolled key:', key)
    }
  }
}
