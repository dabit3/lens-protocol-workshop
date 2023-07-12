## Lens Protocol Workshop

In this workshop you'll learn how to use Next.js, TypeScript, Lens Protocol, and the [Lens SDK](https://docs.lens.xyz/docs/sdk-react-intro) to build out a social application.

The app we'll be building will have the following features:

1. When the app loads, it will render a list of recommended users from the Lens API along with their profile picture and bio
2. When we click on a user, we will navigate to a detail view where we will see all of their publications as well as more profile details
3. The user profile view will also have the option for a user to sign in and follow another user.

By the end of this tutorial you'll have a good understanding of how to get started building on Lens with TypeScript and the Lens SDK.

![Lens Dev Stack](sdk.png)

### Getting started

To get started, create a new Next.js application:

```sh
npx create-next-app lens-app

✔ Would you like to use TypeScript with this project? Yes
✔ Would you like to use ESLint with this project? Yes
✔ Would you like to use Tailwind CSS with this project?  Yes
✔ Would you like to use `src/` directory with this project? No
✔ Use App Router (recommended)? Yes
✔ Would you like to customize the default import alias? No
```

Next, change into the new directory and install the following dependencies:

```sh
cd lens-app

npm install @lens-protocol/react-web @lens-protocol/wagmi wagmi viem
```

## app/layout.tsx

Next, we want to configure our app to use the Lens SDK. 

This is typically done at the entrypoint to the app, and only needs to be done once.

This is a decent amount of code, but once it's set up it makes using the SDK very easy in our components.

Update `app/layout.tsx` with the following code:

```tsx
// app/layout.tsx
"use client";
import "./globals.css";
import { polygonMumbai, polygon } from "wagmi/chains";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { publicProvider } from "wagmi/providers/public";
import { InjectedConnector } from "wagmi/connectors/injected";
import { LensProvider, LensConfig, production } from "@lens-protocol/react-web";
import { bindings as wagmiBindings } from "@lens-protocol/wagmi";

const { publicClient, webSocketPublicClient } = configureChains(
  [polygonMumbai, polygon],
  [publicProvider()]
);

const config = createConfig({
  autoConnect: true,
  publicClient,
  webSocketPublicClient,
  connectors: [
    new InjectedConnector({
      options: {
        shimDisconnect: false,
      },
    }),
  ],
});

const lensConfig: LensConfig = {
  bindings: wagmiBindings(),
  environment: production,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <WagmiConfig config={config}>
        <LensProvider config={lensConfig}>
          <body>{children}</body>
        </LensProvider>
      </WagmiConfig>
    </html>
  );
}
```

## app/page.tsx

Next, let's query for profiles and render them in our app.

To do so, open `app/page.tsx` and add the following code:

```typescript
// app/page.tsx
'use client'
import { useExploreProfiles } from '@lens-protocol/react-web'
import Link from 'next/link'

export default function Home() {
  const { data } = useExploreProfiles({
    limit: 25
  })
  
  return (
    <div className='p-20'>
      <h1 className='text-5xl'>My Lens App</h1>
      {
        data?.map((profile, index) => (
          <Link href={`/profile/${profile.handle}`} key={index}>
            <div className='my-14'>
              {
                profile.picture && profile.picture.__typename === 'MediaSet' ? (
                  <img
                    src={profile.picture.original.url}
                    width="120"
                    height="120"
                    alt={profile.handle}
                  />
                ) : <div className="w-14 h-14 bg-slate-500	" />
              }
              <h3 className="text-3xl my-4">{profile.handle}</h3>
              <p className="text-xl">{profile.bio}</p>
            </div>
          </Link>
        ))
      }
    </div>
  )
}

```

#### What's happening?

In `useExploreProfiles`, we are calling the Lens API to fetch a list of recommended profiles.

Once the profiles are returned, we map over them, rendering each profile with their profile details and a link to view the individual profile which we'll build out later.


### Testing it out

To run the app, run the following command:

```sh
npm run dev
```

## Profile View

In the above code, we've added a link to each profile that, when clicked, will navigate to `/profile/profile.id`. What we want to happen is that when a user navigates to that page, they are able to view more details about that profile.

We also want go give users a way to sign in and follow users.

This functionality does not yet exist, so let's create it.

In the `app` directory, create a new folder named `profile`.

In the `profile` directory create a new folder named `[id]`.

In the `[id]` folder, create a new file named `page.tsx`.

In this file, add the following code:

```typescript
// app/profile/[id]/page.tsx
'use client'
import { usePathname } from 'next/navigation';
import {
  useProfile, usePublications, Profile
} from '@lens-protocol/react-web';

export default function Profile() {
  const pathName = usePathname()
  const handle = pathName?.split('/')[2]

  let { data: profile, loading } = useProfile({ handle })

  if (loading) return <p className="p-14">Loading ...</p>

  return (
    <div>
      <div className="p-14">
        {
          profile?.picture?.__typename === 'MediaSet' && (
            <img
              width="200"
              height="200"
              alt={profile.handle}
              className='rounded-xl'
              src={profile.picture.original.url}
            />
          )
        }
        <h1 className="text-3xl my-3">{profile?.handle}</h1>
        <h3 className="text-xl mb-4">{profile?.bio}</h3>
       { profile && <Publications profile={profile} />}
      </div>
    </div>
  )
}

function Publications({
  profile
}: {
  profile: Profile
}) {
  let { data: publications } = usePublications({
    profileId: profile.id,
    limit: 10,
  })
  publications = publications?.map(publication => {
    if (publication.__typename === 'Mirror') {
      return publication.mirrorOf
    } else {
      return publication
    }
  })

  return (
    <>
      {
        publications?.map((pub: any, index: number) => (
          <div key={index} className="py-4 bg-zinc-900 rounded mb-3 px-4">
            <p>{pub.metadata.content}</p>
            {
              pub.metadata?.media[0]?.original && ['image/jpeg', 'image/png'].includes(pub.metadata?.media[0]?.original.mimeType) && (
                <img
                  width="400"
                  height="400"
                  alt={profile.handle}
                  className='rounded-xl mt-6 mb-2'
                  src={pub.metadata.media[0]}
                />
              )
            }
          </div>
        ))
    }
    </>
  )
}
```

### What's happening

`useProfile` allows you to get a user's profile details by passing in a Lens handle or profile ID

`usePublications` allows you to fetch a user's publications by passing in a profile


### Testing it out

To run the app, run the following command:

```sh
npm run dev
```

## Adding authentication and following a user

Next, let's add some additional functionality that will allow a user to sign and and then follow another user.

```typescript
// app/profile/[id]/page.tsx
'use client'
import { usePathname } from 'next/navigation';
// new imports
import {
  useProfile, usePublications, useFollow, useWalletLogin, useWalletLogout, useActiveProfile,
  Profile, ProfileOwnedByMe, NotFoundError
} from '@lens-protocol/react-web';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';

export default function Profile() {
  // new hooks
  const { execute: login } = useWalletLogin();
  const { execute: logout } = useWalletLogout();
  const { data: wallet } = useActiveProfile();
  const { isConnected } = useAccount();
  const { disconnectAsync } = useDisconnect();
  
  const pathName = usePathname()
  const handle = pathName?.split('/')[2]

  let { data: profile, loading } = useProfile({ handle })

  const { connectAsync } = useConnect({
    connector: new InjectedConnector(),
  });
  
  // new login function
  const onLoginClick = async () => {
    if (isConnected) {
      await disconnectAsync();
    }
    const { connector } = await connectAsync();
    if (connector instanceof InjectedConnector) {
      const signer = await connector.getSigner();
      await login(signer);
    }
  }

  if (loading) return <p className="p-14">Loading ...</p>

  return (
    <div>
      <div className="p-14">
        {
          !wallet && (
            <button className="bg-white text-black px-14 py-4 rounded-full mb-4" onClick={onLoginClick}>Sign In</button>
          )
        }
        {
          wallet && profile && (
            <>
            <FollowComponent
              isConnected={isConnected}
              profile={profile}
              wallet={wallet}
            />
            <button className="ml-4 bg-white text-black px-14 py-4 rounded-full mb-4" onClick={logout}>Sign Out</button>
            </>
          )
        }
        {
          profile && profile.picture?.__typename === 'MediaSet' && (
            <img
              width="200"
              height="200"
              alt={profile.handle}
              className='rounded-xl'
              src={profile.picture.original.url}
            />
          )
        }
        <h1 className="text-3xl my-3">{profile?.handle}</h1>
        <h3 className="text-xl mb-4">{profile?.bio}</h3>
        { profile && <Publications profile={profile} /> }
      </div>
    </div>
  )
}

// new component
function FollowComponent({
  wallet,
  profile,
  isConnected
} : {
  isConnected: boolean,
  profile: Profile,
  wallet: ProfileOwnedByMe
}) {
  const { execute: follow } = useFollow({ followee: profile, follower: wallet  });
  return (
    <>
      {
        isConnected && (
          <button
            className="bg-white text-black px-14 py-4 rounded-full"
            onClick={follow}
          >Follow {profile.handle}</button>
        )
      }
    </>
  )
}

function Publications({
  profile
}: {
  profile: Profile
}) {
  let { data: publications } = usePublications({
    profileId: profile.id,
    limit: 20,
  })
  publications = publications?.map(publication => {
    if (publication.__typename === 'Mirror') {
      return publication.mirrorOf;
    } else {
      return publication;
    }
  });

  return (
    <>
      {
        publications?.map((pub: any, index: number) => (
          <div key={index} className="py-4 bg-zinc-900 rounded mb-3 px-4">
            <p>{pub.metadata.content}</p>
            {
              pub.metadata?.media[0]?.original && ['image/jpeg', 'image/png'].includes(pub.metadata?.media[0]?.original.mimeType) && (
                <img
                  width="400"
                  height="400"
                  alt={profile.handle}
                  className='rounded-xl mt-6 mb-2'
                  src={pub.metadata.media[0]}
                />
              )
            }
          </div>
        ))
    }
    </>
  )
}
```

When you run the app, you should now be able to sign in and follow another user.

### Next Steps

Now that you've built your first basic application, it's time to explore more of the Lens API!

Consider diving into modules or learning about gasless transactions and the dispatcher.

Also consider adding the following features to your new app:

- Searching for users
- Creating a post
