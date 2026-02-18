export type UserId = string

export interface User {
  id: UserId
  name: string
  avatar?: string
  initials: string
  color: string
}
