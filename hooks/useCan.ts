import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { validateUserPermissions } from '../utils/validateUserPermissions'

type UseCanParams = {
  permissions?: string[]
  roles?: string[]
}

//retorna se o usuario pode ou nao pode fazer alguma coisa
export function useCan({ permissions, roles }: UseCanParams) {
  const { user, isAuthenticated } = useContext(AuthContext)

  if (!isAuthenticated) {
    return false
  }

  const userHasValidPermissions = validateUserPermissions({
    user,
    permissions,
    roles,
  })

  return userHasValidPermissions
}
