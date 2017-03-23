
export function loginApi(authData) {
  return authData.getToken()
    .then((token) => {
      return fetch('/api/login', {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json'
        }),
        credentials: 'same-origin',
        body: JSON.stringify({token}
        )
      })
    })
    .then((res) => res)
}

export function logoutApi() {
  return fetch('/api/logout', {
    method: 'POST',
    credentials: 'same-origin'
  })
}
