import Shape from '../../shared/Shape'
import Line from '../../shared/Line'
import Circle from '../../shared/Circle'
import Label from '../../shared/Label'

export default class State {
  shapes = new Map<number, Shape>()
  lines: Line[] = []
  circles: Circle[] = []
  labels: Label[] = []
  id?: string
  torsoId?: number
}
