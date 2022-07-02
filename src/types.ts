export interface Input {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  select: boolean
}

export interface Shape {
  vertices: Matter.Vector[]
  render: Matter.IBodyRenderOptions
}
