export type ToothCategory = 'incisivo' | 'canino' | 'premolar' | 'molar'

export const getToothCategory = (toothNumber: number): ToothCategory => {
  const lastDigit = toothNumber % 10

  if (lastDigit === 1 || lastDigit === 2) return 'incisivo'
  if (lastDigit === 3) return 'canino'
  if (lastDigit === 4 || lastDigit === 5) return 'premolar'
  return 'molar' // 6, 7, 8
}