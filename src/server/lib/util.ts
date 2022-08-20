export function whichMin <Element> (array: Element[], numbers: number[]): Element {
  const minimum = Math.min(...numbers)
  const index = numbers.indexOf(minimum)
  const element = array[index]

  return element
}

export function whichMax <Element> (array: Element[], numbers: number[]): Element {
  const minimum = Math.max(...numbers)
  const index = numbers.indexOf(minimum)
  const element = array[index]

  return element
}
