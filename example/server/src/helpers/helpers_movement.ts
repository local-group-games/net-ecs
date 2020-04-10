import { InputData } from "../types"

export function applyInput(
  input: InputData,
  transform: { x: number; y: number },
  out: { x: number; y: number } = transform,
) {
  const [up, right, down, left, , step] = input
  const factor = 500 * step

  if (input[0] + input[1] + input[2] + input[3] === 0) {
    return false
  }

  if (up) out.y = transform.y - factor
  if (right) out.x = transform.x + factor
  if (down) out.y = transform.y + factor
  if (left) out.x = transform.x - factor

  return true
}
