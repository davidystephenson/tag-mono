import DebugLabel from '../../shared/DebugLabel'
import { VISION_INNER_HEIGHT, VISION_INNER_WIDTH } from '../../shared/VISION'
import { DEBUG } from '../lib/debug'
import Bot from './Bot'
import Brick from './Brick'
import Character from './Character'
import Wall from './Wall'
import Waypoint from './Waypoint'

export default class Game {
  name = 'World'

  constructor ({
    centerBot,
    cornerBots,
    country,
    countryBots,
    greek,
    greekBots,
    gridBots,
    midpointBots,
    size,
    town,
    townBots,
    waypointBots,
    waypointBricks,
    wildBricks
  }: {
    centerBot?: boolean
    cornerBots?: boolean
    country?: boolean
    countryBots?: boolean
    greek?: boolean
    greekBots?: boolean
    gridBots?: boolean
    midpointBots?: boolean
    size: number
    town?: boolean
    townBots?: boolean
    waypointBots?: boolean
    waypointBricks?: boolean
    wildBricks?: boolean
  }) {
    const halfSize = size / 2
    const marginEdge = halfSize - Character.MARGIN
    const townWalls: Wall[] = []
    if (town === true) {
      const PIT = new Wall({ x: 605, y: -955, width: 1700, height: 1000 })
      const BYTE = new Wall({ x: -500, y: -1300, width: 5, height: 5 })
      const PALACE = new Wall({ x: -1000, y: -1150, width: 600, height: 310 })
      const BIT = new Wall({ x: -500, y: -1100, width: 1, height: 1 })
      const FORT = new Wall({ x: -872.5, y: -900, width: 1165, height: 100 })
      const MANSION = new Wall({ x: -520, y: -700, width: 460, height: 210 })
      const KNIFE = new Wall({ x: -1244.75, y: -659, width: 420.5, height: 2 })
      const SCALPEL = new Wall({ x: -1244.75, y: -612.5, width: 420.5, height: 1 })
      const OUTPOST = new Wall({ x: -1244.75, y: -517, width: 420.5, height: 100 })
      const DAGGER = new Wall({ x: -988, y: -500, width: 3, height: 610 })
      const RAPIER = new Wall({ x: -941, y: -400, width: 1, height: 810 })
      const PRECINCT = new Wall({ x: -845, y: -500, width: 100, height: 610 })
      const BUTCHER = new Wall({ x: -700, y: -500, width: 100, height: 100 })
      const BAKER = new Wall({ x: -555, y: -500, width: 100, height: 100 })
      const CANDLESTICK = new Wall({ x: -375, y: -500, width: 170, height: 100 })
      const BAYONET = new Wall({ x: -1244.75, y: -419.5, width: 420.5, height: 5 })
      townWalls.push(PIT, BYTE, PALACE, BIT, FORT, MANSION, KNIFE, SCALPEL, OUTPOST, DAGGER, RAPIER, PRECINCT, BUTCHER, BAKER, CANDLESTICK, BAYONET)
    }

    const greekWalls: Wall[] = []
    if (greek === true) {
      const alpha = new Wall({ x: -1454.5, y: -755, width: 1, height: 100 })
      const beta = new Wall({ x: -1408.5, y: -755, width: 1, height: 100 })
      const gamma = new Wall({ x: -1363, y: -755, width: 1, height: 100 })
      const delta = new Wall({ x: -1317.5, y: -755, width: 1, height: 100 })
      const epsilon = new Wall({ x: -1272, y: -755, width: 1, height: 100 })
      const zeta = new Wall({ x: -1226.5, y: -755, width: 1, height: 100 })
      const eta = new Wall({ x: -1181, y: -755, width: 1, height: 100 })
      const theta = new Wall({ x: -1135.5, y: -755, width: 1, height: 100 })
      const iota = new Wall({ x: -1090, y: -755, width: 1, height: 100 })
      const kappa = new Wall({ x: -1039.275, y: -801, width: 9.45, height: 8 })
      const lamda = new Wall({ x: -1039.275, y: -751.5, width: 9.45, height: 1 })
      const mu = new Wall({ x: -1039.275, y: -705.5, width: 9.45, height: 1 })
      greekWalls.push(alpha, beta, gamma, delta, epsilon, zeta, eta, theta, iota, kappa, lamda, mu)
      townWalls.concat(greekWalls)
    }

    const countryWalls: Wall[] = []
    if (country === true) {
      countryWalls.push(
        new Wall({ x: -1100, y: 400, width: 200, height: 500 }),
        new Wall({ x: 0, y: -200, width: 100, height: 100 }),
        new Wall({ x: 1000, y: 200, width: 200, height: 1000 }),
        new Wall({ x: -400, y: 600, width: 1000, height: 1000 }),
        new Wall({ x: 450, y: 700, width: 100, height: 800 }),
        new Wall({ x: -800, y: 1300, width: 400, height: 200 }),
        new Wall({ x: 300, y: 1300, width: 800, height: 200 }),
        new Wall({ x: -1250, y: 1300, width: 200, height: 50 })
      )
    }
    const EDGE_PADDING = Character.MARGIN
    const innerSize = size - EDGE_PADDING * 2
    let xFactor = 2
    let xSegment = innerSize / xFactor
    while (xSegment > VISION_INNER_WIDTH) {
      xFactor = xFactor + 1
      xSegment = innerSize / xFactor
    }
    let yFactor = 2
    let ySegment = innerSize / yFactor
    while (ySegment > VISION_INNER_HEIGHT) {
      yFactor = yFactor + 1
      ySegment = innerSize / yFactor
    }
    const gridWaypoints: Waypoint[] = []
    for (let i = 0; i <= xFactor; i++) {
      for (let j = 0; j <= yFactor; j++) {
        const x = -innerSize / 2 + i * xSegment
        const y = -innerSize / 2 + j * ySegment

        gridWaypoints.push(new Waypoint({ x, y }))
      }
    }
    console.log('begin navigation')
    Waypoint.waypoints.forEach(waypoint => { waypoint.distances = Waypoint.waypoints.map(() => Infinity) })
    console.log('setting neighbors...')
    Waypoint.waypoints.forEach(waypoint => waypoint.setNeighbors())
    console.log('updating distances...')
    Waypoint.waypoints.forEach(() => Waypoint.waypoints.forEach(waypoint => waypoint.updateDistances()))
    console.log('setting paths...')
    Waypoint.waypoints.forEach(waypoint => waypoint.setPaths())
    console.log('debugging waypoints...')
    Waypoint.waypoints.forEach(waypoint => {
      if (DEBUG.WAYPOINT_LABELS) {
        const y = DEBUG.WAYPOINT_CIRCLES ? waypoint.y + 20 : waypoint.y
        void new DebugLabel({
          x: waypoint.x, y, text: String(waypoint.id), color: 'white'
        })
      }
    })

    console.log('navigation complete')
    if (wildBricks === true) {
      void new Brick({ x: -30, y: -30, height: 30, width: 30 })
      void new Brick({ x: 30, y: -30, height: 30, width: 30 })
      void new Brick({ x: 0, y: -30, height: 30, width: 30 })
      void new Brick({ x: 0, y: -30, height: 30, width: 100 })
      void new Brick({ x: 30, y: 0, height: 30, width: 50 })
      void new Brick({ x: -30, y: 0, height: 50, width: 30 })
      void new Brick({ x: -800, y: 0, height: 80, width: 30 })
      void new Brick({ x: -900, y: 0, height: 50, width: 50 })
      void new Brick({ x: -1000, y: 0, height: 50, width: 50 })
      void new Brick({ x: -1100, y: 0, height: 90, width: 80 })
      void new Brick({ x: -1200, y: 0, height: 50, width: 50 })
      void new Brick({ x: -1300, y: 0, height: 50, width: 50 })
      void new Brick({ x: -1400, y: 0, height: 50, width: 50 })
      void new Brick({ x: 0, y: 30, height: 30, width: 30 })
      void new Brick({ x: 30, y: 30, height: 30, width: 30 })
      void new Brick({ x: -30, y: 30, height: 30, width: 30 })
      void new Brick({ x: 800, y: 200, height: 200, width: 100 })
      void new Brick({ x: -500, y: 1400, height: 100, width: 200 })
      void new Brick({ x: -1300, y: 1300, height: 200, width: 30 })
      void new Brick({ x: 750, y: 1300, height: 200, width: 30 })
      void new Brick({ x: 800, y: 1300, height: 200, width: 30 })
      void new Brick({ x: 850, y: 1300, height: 200, width: 30 })
      void new Brick({ x: 900, y: 1300, height: 200, width: 30 })
      void new Brick({ x: 950, y: 1300, height: 200, width: 30 })
      void new Brick({ x: 1000, y: 1300, height: 200, width: 30 })
      void new Brick({ x: 1050, y: 1300, height: 200, width: 30 })
      void new Brick({ x: 1100, y: 1300, height: 200, width: 30 })
      void new Brick({ x: 1150, y: 1300, height: 100, width: 30 })
      void new Brick({ x: 1200, y: 1300, height: 200, width: 30 })
      void new Brick({ x: 1250, y: 1300, height: 200, width: 30 })
      void new Brick({ x: 1300, y: 1300, height: 300, width: 30 })
      void new Brick({ x: 1350, y: 1300, height: 200, width: 30 })
      void new Brick({ x: 1400, y: 1300, height: 200, width: 30 })
      void new Brick({ x: 1450, y: 1300, height: 200, width: 30 })
    }
    if (centerBot === true) {
      void new Bot({ x: -750, y: -240 })
    }

    if (greekBots === true) greekWalls.forEach(wall => wall.spawnBots())
    if (townBots === true) townWalls.forEach(wall => wall.spawnBots())
    if (gridBots === true) gridWaypoints.forEach(waypoint => new Bot({ x: waypoint.x, y: waypoint.y }))
    if (countryBots === true) countryWalls.forEach(wall => wall.spawnBots())
    if (waypointBots === true) {
      Waypoint.waypoints.forEach(waypoint => {
        void new Bot({ x: waypoint.x, y: waypoint.y })
      })
    }
    if (waypointBricks === true) {
      Waypoint.waypoints.forEach(waypoint => {
        void new Brick({ x: waypoint.x, y: waypoint.y, width: Bot.MAXIMUM_RADIUS * 2, height: Bot.MAXIMUM_RADIUS * 2 })
      })
    }
    if (cornerBots === true) {
      void new Bot({ x: -marginEdge, y: -marginEdge })
      void new Bot({ x: marginEdge, y: -marginEdge })
      void new Bot({ x: -marginEdge, y: marginEdge })
      void new Bot({ x: marginEdge, y: marginEdge })
    }
    if (midpointBots === true) {
      void new Bot({ x: 0, y: -marginEdge })
      void new Bot({ x: marginEdge, y: 0 })
      void new Bot({ x: 0, y: marginEdge })
      void new Bot({ x: -marginEdge, y: 0 })
    }
  }
}
