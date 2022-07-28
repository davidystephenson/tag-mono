export default function inRange ({ start, end, range }: {
  start: number
  end: number
  range: number
}): boolean {
  return Math.abs(start - end) < range
}
