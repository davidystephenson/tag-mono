import Controls from './controls'
import Circle from './Circle'
import Label from './Label'
import Line from './Line'
import Shape from './Shape'

export interface UpdateMessage {
  shapes: Record<number, Shape>
  lines: Line[]
  circles: Circle[]
  labels: Label[]
  torsoId?: number
}

export interface ServerToClientEvents {
  socketId: (id: string) => void
  updateClient: ({ shapes }: UpdateMessage) => void
}

export interface ClientToServerEvents {
  updateServer: ({ id, controls }: {id?: string, controls: Controls}) => void
}
