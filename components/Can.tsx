import { ReactNode } from 'react'
import { useCan } from '../hooks/useCan'

interface CanProps {
  children: ReactNode
  permissions?: string[]
  roles?: string[]
}

//retorna se o usuario pode ou nao acessar um componente
export function Can({ children, permissions, roles }: CanProps) {
  const userCanSeeComponent = useCan({
    permissions,
    roles,
  })

  if (!userCanSeeComponent) {
    return null
  }

  return <>{children}</>
}
