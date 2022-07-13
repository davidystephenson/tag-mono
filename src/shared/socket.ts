import DebugLine from './DebugLine'
import Input from './Input'
import Shape from './Shape'

export interface ServerToClientEvents {
  socketId: (id: string) => void
  updateClient: ({ shapes }: { shapes: Record<number, Shape>, debugLines: DebugLine[], torsoId?: number }) => void
}

export interface ClientToServerEvents {
  updateServer: ({ id, input }: {id?: string, input: Input}) => void
}
