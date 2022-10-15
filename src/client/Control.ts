import Input from '../shared/Input'

export default class Control {
  key: string
  input: keyof Input

  constructor ({ key, input }: {
    key: string
    input: keyof Input
  }) {
    this.key = key
    this.input = input
  }
}
