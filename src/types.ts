export interface Input {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  select: boolean
}

export interface Shape {
  circleRadius?: number
  x: number
  y: number
  vertices: Matter.Vector[]
  render: Matter.IBodyRenderOptions
}
