import { defineStore } from 'pinia'
import type { User, UserId } from '~/shared/types'
import { SEED_USERS } from '~/shared/api/seed'

export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>([])
  const currentUserId = ref<UserId | null>(null)

  const currentUser = computed(() =>
    users.value.find(u => u.id === currentUserId.value) ?? null
  )

  function getUserById(id: UserId): User | undefined {
    return users.value.find(u => u.id === id)
  }

  function getUsersByIds(ids: UserId[]): User[] {
    return ids.map(id => getUserById(id)).filter(Boolean) as User[]
  }

  function setCurrentUser(id: UserId) {
    currentUserId.value = id
  }

  function init() {
    users.value = [...SEED_USERS]
    currentUserId.value = SEED_USERS[0]?.id ?? null
  }

  return {
    users,
    currentUserId,
    currentUser,
    getUserById,
    getUsersByIds,
    setCurrentUser,
    init
  }
})
