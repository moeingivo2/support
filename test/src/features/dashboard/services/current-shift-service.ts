import { getCurrentUser } from '@/shared/services/auth-service'

export const currentUserKeys = {
  all: ['current-user'] as const,
}

export { getCurrentUser }
