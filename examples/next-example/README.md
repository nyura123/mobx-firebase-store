
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

Show how mobx-firebase-store and autoSubscriber can be used to load initial firebase data (including async child data),
and then automatically keep the component "live" on the client.

The component's async getInitialSubs creates a store and waits till it populates via `subscribeSubsWithPromise` promise.
It then converst the store's observable data to plain json so it can be rendered on the client.
The component's constructor then creates a store whose observable maps are populated from the initial server-rendered data (initialProps.initialData).

This project needs a custom next.js server so we can use firebase-admin on the server, while using client firebase lib on the client (see serverFirebase.js and store.js)


