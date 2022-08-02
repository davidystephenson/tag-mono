import Controls, { controlKeys, ControlKey, Control } from './controls'

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
    const control = controlKeys[key as ControlKey] as Control | undefined
    if (control != null) {
      this.controls[control] = value
    }
  }
}
