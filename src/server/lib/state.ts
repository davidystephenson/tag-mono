import Wall from '../model/Wall'

interface State {
  paused: boolean
  walls: Map<number, Wall>
}

const state: State = {
  paused: false,
  walls: new Map<number, Wall>()
}

export default state
