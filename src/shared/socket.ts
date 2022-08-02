import Controls from './controls'
import DebugLine from './DebugLine'
import Shape from './Shape'

export interface ServerToClientEvents {
  socketId: (id: string) => void
  updateClient: ({ shapes }: { shapes: Record<number, Shape>, debugLines: DebugLine[], torsoId?: number }) => void
}

export interface ClientToServerEvents {
  updateServer: ({ id, controls }: {id?: string, controls: Controls}) => void
}
