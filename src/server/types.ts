import Waypoint from './Waypoint'

export interface Goal {
  number: number
  passed: boolean
  heading: Heading
  scored: boolean
}
export interface Heading {
  waypoint: Waypoint
  time: number
  distance: number
  tight: boolean
  explored: boolean
}
