import Control from '../model/Control'

const controls = [
  new Control({ key: 'w', input: 'up' }),
  new Control({ key: 's', input: 'down' }),
  new Control({ key: 'a', input: 'left' }),
  new Control({ key: 'd', input: 'right' }),
  new Control({ key: 'W', input: 'up' }),
  new Control({ key: 'S', input: 'down' }),
  new Control({ key: 'A', input: 'left' }),
  new Control({ key: 'D', input: 'right' }),
  new Control({ key: 'ArrowUp', input: 'up' }),
  new Control({ key: 'ArrowDown', input: 'down' }),
  new Control({ key: 'ArrowLeft', input: 'left' }),
  new Control({ key: 'ArrowRight', input: 'right' }),
  new Control({ key: 'Enter', input: 'select' }),
  new Control({ key: ' ', input: 'select' })
]

export default controls
