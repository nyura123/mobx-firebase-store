
# Next.js example with mobx-firebase-store - cloned from [with-mobx](https://github.com/zeit/next.js/tree/master/examples/with-mobx)

## How to use

Download the example [or clone the repo](https://github.com/nyura123/mobx-firebase-store):

```bash
curl https://codeload.github.com/nyura123/mobx-firebase-store/tar.gz/master | tar -xz --strip=2 mobx-firebase-store-master/examples/next-example
cd next-example
```

Install it and run:

Update your serverFirebase info in serviceAccountKey.js -- see [firebase-admin setup](https://firebase.google.com/docs/admin/setup)

```bash
npm install
npm run dev
```

Deploy it to the cloud with [now](https://zeit.co/now) ([download](https://zeit.co/download))

```bash
now
```

## The idea behind the example

Shows how data can be rendered initially on the server, then be updated in real-time on the client. Also shows firebase auth on server and client, and protected routes.

mobx-firebase-store `subscribeSubsWithPromise` is used in `getInitialProps` to load initial firebase data, including nested/child firebase queries.
Note: the store created in getInitialProps is thrown away, and only used for convenience to subscribe and get the initial data. 
The props returned by getInitialProps must be plain data/json.

The store is then initialized with the initial data in the constructor; this happens both on the client and the server.
The store's observable maps are internally populated with the initial data, and then kept live via createAutoSubscriber component's getSubs/subscribeSubs on the client.

firebase-admin is used on the server, firebase on the client (see store.js `getFirebaseInfo)`.
This project needs a custom next.js server so we can import and use firebase-admin on the server only - importing it from components causes errors in the browser due to missing node libs like `fs`(see `serverFirebase.js`).

## Auth and protected routes
When a client logs in via Firebase API, the auth token is posted to /api/login and the server saves it in the session (`express-session` is used for that)
On logout, /api/logout is hit which makes the server forget the token.

The session's token is returned from getInitialProps (along with initialData), and is saved in the store (as `decodedToken`). 
The authUser() getter returns either the client's observable authUser or the decodedToken if on the server. 
So auth-dependent rendering can be done by components on both the server and client.

On the client, the store watches the auth state via Firebase's `onAuthStateChanged` and posts to /api/login or /api/logout.
There's no harm in posting to these routes multiple times. This ensures the server is up-to-date with auth state in various edge cases - for example, if the session cookie expires, then next browser reload will set the token in the newly-created session.
Similarly, if firebase auth expires on the client (even without the user explicitly logging out), the session's token will be updated as well.

## Auth-dependent firebase subscriptions
In the protected route (`other.js`), the autoSubscriber's getSubs return `[]` if user's logged out, based on the observable authUser.
The fact that it's observable causes the subscriptions to be updated automatically by autoSubscriber.



