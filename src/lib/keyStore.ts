let inMemoryKey: string | null = null

export const setKey = (k: string) => {
  inMemoryKey = k
}

export const getKey = () => inMemoryKey

export const clearKey = () => {
  inMemoryKey = null
}
