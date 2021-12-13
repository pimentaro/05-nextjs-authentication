import { createContext, ReactNode, useEffect, useState } from 'react'

import Router from 'next/router'
import { destroyCookie, parseCookies, setCookie } from 'nookies'
import { api } from '../services/apiClient'

type User = {
  email: string
  permissions: string[]
  roles: string[]
}

type SignInCredentials = {
  email: string
  password: string
}

type AuthContextData = {
  signIn: (credentials: SignInCredentials) => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
  user: User
}

type AuthProviderProps = {
  children: ReactNode
}
//..as AuthContextData -> serve pro intelisense
export const AuthContext = createContext({} as AuthContextData)

let authChannel: BroadcastChannel

export function signOut() {
  destroyCookie(undefined, 'nextauth.token')
  destroyCookie(undefined, 'nextauth.refreshToken')

  authChannel.postMessage('signOut')

  Router.push('/')
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>()
  const isAuthenticated = !!user //se usuario esta autenticado

  useEffect(() => {
    authChannel = new BroadcastChannel('auth')

    authChannel.onmessage = (message) => {
      switch (message.data) {
        case 'signOut':
          signOut()
          authChannel.close()
          break

        default:
          break
      }
    }
  }, [])

  useEffect(() => {
    // as aspas é por causa do ponto.
    // atribui novo nome a variavel -> :token
    const { 'nextauth.token': token } = parseCookies()

    if (token) {
      api
        .get('/me')
        .then((response) => {
          const { email, permissions, roles } = response.data

          setUser({
            email,
            permissions,
            roles,
          })
        })
        .catch(() => {
          //se der algum erro deslogar o usuario
          signOut()
        })
    }
  }, [])

  async function signIn({ email, password }: SignInCredentials) {
    try {
      const response = await api.post('sessions', {
        email,
        password,
      })

      const { permissions, roles, token, refreshToken } = response.data

      // o primeiro argumento é undefined porque a requisicao é pelo lado do browser
      // o segundo é o nome do cookie e o terceiro é o valor do token
      //esse path so com uma barra indica que qualquer caminho da aplicacao pode acessar o cookie
      setCookie(undefined, 'nextauth.token', token, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })

      setCookie(undefined, 'nextauth.refreshToken', refreshToken, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })

      //quando o usuario fizer login coloca o token no cabeçalho
      api.defaults.headers['Authorization'] = `Bearer ${token}`

      setUser({
        email,
        permissions,
        roles,
      })

      Router.push('/dashboard')
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <AuthContext.Provider value={{ signIn, signOut, isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  )
}
