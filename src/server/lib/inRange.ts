export default function inRange ({ start, end, range }: {
  start: number
  end: number
  range: number
}): boolean {
  const difference = end - start
  const absolute = Math.abs(difference)

  return absolute < range
}
