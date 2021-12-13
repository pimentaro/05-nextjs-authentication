import {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from 'next'
import { parseCookies } from 'nookies'

//essa função é pra paginas onde o usuario nao esta logado poder acessar. so usuarios nao
// logados podem acessar a pagina que usa essa funcao
export function withSSRGuest<P>(fn: GetServerSideProps<P>) {
  return async (
    ctx: GetServerSidePropsContext
  ): Promise<GetServerSidePropsResult<P>> => {
    //verificar se existe cookies
    const cookies = parseCookies(ctx)

    //se tiver cookies vou direcionar o usuario para o dashboard

    if (cookies['nextauth.token']) {
      return {
        redirect: {
          destination: '/dashboard',
          permanent: false,
        },
      }
    }
    //se nao tiver cookie vou retornar a funcao original
    return await fn(ctx)
  }
}
