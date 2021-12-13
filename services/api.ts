import axios, { AxiosError } from 'axios'
import { parseCookies, setCookie } from 'nookies'
import { signOut } from '../contexts/AuthContext'
import { AuthTokenError } from './errors/AuthTokenError'

let isRefreshing = false // identifica se estou atualizando o token ou nao
let failedRequestsQueue = [] // sao todas as requisições que deram falha por causa do token expirado

export function setupApiClient(ctx = undefined) {
  let cookies = parseCookies(ctx)

  // o header autorization vai em toda requisicao. ele é extraido do cookie nextauth.token
  const api = axios.create({
    baseURL: 'http://localhost:3333',
    headers: {
      Authorization: `Bearer ${cookies['nextauth.token']}`,
    },
  })

  // refresh do token expirado
  api.interceptors.response.use(
    (response) => {
      //retorno se o token nao esta expirado
      return response
    },
    //retorno quando o token esta expirado
    (error: AxiosError) => {
      if (error.response.status === 401) {
        if (error.response.data?.code === 'token.expired') {
          //deslogar o usuario
          cookies = parseCookies()

          const { 'nextauth.refreshToken': refreshToken } = cookies
          const originalConfig = error.config

          //se nao estiver realizando o refreshing
          if (!isRefreshing) {
            isRefreshing = true

            //pega o refreshtoken joga pra api e a api manda um novo token e refreshtoken
            api
              .post('/refresh', {
                refreshToken,
              })
              .then((response) => {
                const { token } = response.data

                setCookie(ctx, 'nextauth.token', token, {
                  maxAge: 60 * 60 * 24 * 30, // 30 days
                  path: '/',
                })

                setCookie(
                  ctx,
                  'nextauth.refreshToken',
                  response.data.refreshToken,
                  {
                    maxAge: 60 * 60 * 24 * 30, // 30 days
                    path: '/',
                  }
                )

                //pega a lista de requisiçoes falhadas e pra cada vou pega a requisicao e executar
                //o metodo onsucess passando o token atualizado
                failedRequestsQueue.forEach((request) =>
                  request.onSuccess(token)
                )
                failedRequestsQueue = []
                //depois limpa a lista
              })
              .catch((err) => {
                failedRequestsQueue.forEach((request) => request.onFailure(err))
                //depois limpa a lista
                failedRequestsQueue = []

                if (process.browser) {
                  signOut()
                } else {
                  return Promise.reject(new AuthTokenError())
                }
              })
              .finally(() => {
                isRefreshing = false
              })
          }

          //troca o token se sucesso
          return new Promise((resolve, reject) => {
            failedRequestsQueue.push({
              onSuccess: (token: string) => {
                originalConfig.headers['Authorization'] = `Bearer ${token}`

                resolve(api(originalConfig))
              },
              onFailure: (err: AxiosError) => {
                reject(err)
              },
            })
          })
        } else {
          if (process.browser) {
            signOut()
          }
        }
      }

      return Promise.reject(error)
    }
  )

  return api
}
