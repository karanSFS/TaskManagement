export function boardScrollEdges(scrollLeft: number, clientWidth: number, scrollWidth: number) {
  return {
    left: scrollLeft > 8,
    right: scrollLeft + clientWidth < scrollWidth - 8,
  }
}
