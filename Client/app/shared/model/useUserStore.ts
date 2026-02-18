import type { User, UserId } from '../types/user'
import { SEED_USERS } from '~/shared/api/seed'
import { resolveByIds } from '~/shared/utils'

const users = ref<User[]>([])
const currentUserId = ref<UserId | null>(null)

export function useUserStore() {
  const currentUser = computed(() =>
    users.value.find(u => u.id === currentUserId.value) ?? null
  )

  function getUserById(id: UserId): User | undefined {
    return users.value.find(u => u.id === id)
  }

  function getUsersByIds(ids: UserId[]): User[] {
    return resolveByIds(ids, id => getUserById(id))
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
}
