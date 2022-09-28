import Controls from './controls'
import DebugCircle from './DebugCircle'
import DebugLabel from './DebugLabel'
import DebugLine from './DebugLine'
import Shape from './Shape'

export interface UpdateMessage {
  shapes: Record<number, Shape>
  debugLines: DebugLine[]
  debugCircles: DebugCircle[]
  debugLabels: DebugLabel[]
  torsoId?: number
}

export interface ServerToClientEvents {
  socketId: (id: string) => void
  updateClient: ({ shapes }: UpdateMessage) => void
}

export interface ClientToServerEvents {
  updateServer: ({ id, controls }: {id?: string, controls: Controls}) => void
}
