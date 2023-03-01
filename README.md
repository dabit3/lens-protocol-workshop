## Lens Protocol Workshop

In this workshop you'll learn how to use Next.js and Lens Protocol to build out a basic social media application.

### Getting started

To get started, create a new Next.js application:

```sh
npx create-next-app lens-app

✔ Would you like to use TypeScript with this project? No
✔ Would you like to use ESLint with this project? Yes
✔ Would you like to use `src/` directory with this project? No
✔ Would you like to use experimental `app/` directory with this project? Yes
✔ What import alias would you like configured? … @/*
```

Next, change into the new directory and install the following dependencies:

```sh
cd lens-app

npm install ethers@5.7.2 graphql urql
```

Now we need to configure Next.js to allow IPFS and other file sources. To do so, open `next.config.js` and replace what's there with the following code:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'ipfs.infura.io',
      'statics-polygon-lens-staging.s3.eu-west-1.amazonaws.com',
      'lens.infura-ipfs.io',
      'source.unsplash.com',
      ""
    ],
  },
}

module.exports = nextConfig
```

### Creating the API

Next, create a new file named `api.js` in the root of the project and add the following code:

```javascript
import { createClient } from 'urql'

const APIURL = "https://api.lens.dev"

export const client = new createClient({
  url: APIURL
})
```

This will allow us to call the GraphQL endpoint using URQL, a GraphQL client.

Next, we'll create our first query, [`exploreProfiles`](https://docs.lens.xyz/docs/explore-profiles). This query will return profiles recommended to us by the Lens API.

In `api.js`, add the following code at the bottom of the file:

```javascript
export const exploreProfiles = `
  query ExploreProfiles {
    exploreProfiles(request: { sortCriteria: MOST_FOLLOWERS }) {
      items {
        id
        name
        bio
        handle
        picture {
          ... on MediaSet {
            original {
              url
            }
          }
        }
        stats {
          totalFollowers
        }
      }
    }
  }
`
```

### Fetching publication data

Next, we'll create a query to fetch publications for each user.

For this data we'll use the [`publication`](https://docs.lens.xyz/docs/get-publication) query.

To do so, create a new query in `api.js` with the following code:

```javascript
export const getPublications = `
  query Publications($id: ProfileId!, $limit: LimitScalar) {
    publications(request: {
      profileId: $id,
      publicationTypes: [POST],
      limit: $limit
    }) {
      items {
        __typename 
        ... on Post {
          ...PostFields
        }
      }
    }
  }
  fragment PostFields on Post {
    id
    metadata {
      ...MetadataOutputFields
    }
    createdAt
  }
  fragment MetadataOutputFields on MetadataOutput {
    content
  }
`
```

## app/page.js

Next, let's query for profiles and render then in our app.

To do so, open `app/page.js` and add the following code:

```javascript
'use client'

import { useState, useEffect } from 'react'
import {
  client, exploreProfiles, getPublications
} from '../api'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  const [profiles, setProfiles] = useState([])
  useEffect(() => {
    fetchProfiles()
  }, [])
  async function fetchProfiles() {
    try {
      const response = await client.query(exploreProfiles).toPromise()
      const profileData = await Promise.all(response.data.exploreProfiles.items.map(async profile => {
        const pub = await client.query(getPublications, { id: profile.id, limit: 1 }).toPromise()
        profile.publication = pub.data.publications.items[0]
        let picture = profile.picture
        if (picture && picture.original && picture.original.url) {
          if (picture.original.url.startsWith('ipfs://')) {
            let result = picture.original.url.substring(7, picture.original.url.length)
            profile.picture.original.url = `http://lens.infura-ipfs.io/ipfs/${result}`
          }
        }
        console.log('profile.picture: ', profile.picture)
        return profile
      }))
      setProfiles(profileData)
    } catch (err) {
      console.log({ err })
    }
  }
  console.log({ profiles })
  return (
    <div style={styles.container}>
      <h1>My Lens App</h1>
      {
        profiles.map((profile, index) => (
          <Link href={`/profile/${profile.id}`} key={index}>
            <div style={styles.profile}>
              {
                profile.picture ? (
                  <Image
                    src={profile.picture.original?.url || "https://source.unsplash.com/random/200x200?sig=1"}
                    width="52"
                    height="52"
                    alt={profile.handle}
                  />
                ) : <div style={blankPhotoStyle} />
              }
              <h3>{profile.handle}</h3>
              <p >{profile.publication?.metadata.content}</p>
            </div>
          </Link>
        ))
      }
    </div>
  )
}

const styles = {
  container: {
    padding: '40px 80px'
  },
  profile: {
    margin: '30px 0px'
  }
}
```

#### What's happening?

In `fetchProfiles`, we are calling the Lens API to fetch profiles and update the state.

Once the profiles come back, we then go back to the server to fetch the first post for each user and attach it to their profile.

We then update the local state to save the profiles.

### Testing it out

To run the app, run the following command:

```sh
npm run dev
```

## Profile View

In the above code, we've added a link to each profile that, when clicked, will navigate to `/profile/profile.id`. What we want to happen is that when a user navigates to that page, they are able to view more details about that profile.

We also want go give users a way to sign in and follow users.

This functionality does not yet exist, so let's create it.

### Updating the API

First, we'll need to create a new GraphQL query for getting a profile.

For this data we'll use the [`getProfile`](https://docs.lens.xyz/docs/get-profile) query:

Open `api.js` and add the following query:

```javascript
export const getProfile = `
  query Profile($id: ProfileId!) {
    profile(request: { profileId: $id }) {
      id
      name
      bio
      picture {
        ... on MediaSet {
          original {
            url
          }
        }
      }
      handle
    }
  }
`
```


### Adding the ABI

Next, we'll need the ABI from the contract we'll be interacting with to allow users to follow other users.

Create a file named `abi.json` at the root of the project.

Next, copy the ABI from the [contract](https://polygonscan.com/address/0x20f4D7DdeE23029048C53B42dc73A02De19F1c9E#ddExportABI) located [here](https://gist.github.com/dabit3/71d8fac2ea4081f32903cb479ea2881a) into this file and save it.

### Profile view

In the `app` directory, create a new folder named `profile`.

In the `profile` directory create a new folder named `[id]`.

In the `[id]` folder, create a new file named `page.js`.

In this file, add the following code:

```javascript
// app/profile/[id]/page.js
'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ethers } from 'ethers'
import Image from 'next/image'
import { client, getPublications, getProfile } from '../../../api'
import ABI from '../../../abi.json'

const CONTRACT_ADDRESS = '0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d'

export default function Profile() {
  const [profile, setProfile] = useState()
  const [connected, setConnected] = useState()
  const [publications, setPublications] = useState([])
  const [account, setAccount] = useState('')

  const pathName = usePathname()
  const id = pathName?.split('/')[2]

  useEffect(() => {
    if (id) {
      fetchProfile()
    }
    checkConnection()
  }, [id])

  async function checkConnection() {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const addresses = await provider.listAccounts();
    if (addresses.length) {
      setConnected(true)
    } else {
      setConnected(false)
    }
  }

  async function fetchProfile() {
    console.log({ id })
    try {
      const returnedProfile = await client.query(getProfile, { id }).toPromise();

      const profileData = returnedProfile.data.profile
      const picture = profileData.picture
      if (picture && picture.original && picture.original.url) {
        if (picture.original.url.startsWith('ipfs://')) {
          let result = picture.original.url.substring(7, picture.original.url.length)
          profileData.picture.original.url = `http://lens.infura-ipfs.io/ipfs/${result}`
        }
      }
      setProfile(profileData)

      const pubs = await client.query(getPublications, { id, limit: 50 }).toPromise()
      setPublications(pubs.data.publications.items)
    } catch (err) {
      console.log('error fetching profile...', err)
    }
  }

  async function connectWallet() {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    })
    console.log('accounts: ', accounts)
    accounts[0]
    setAccount(account)
    setConnected(true)
  }

  function getSigner() {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    return provider.getSigner();
  }

  async function followUser() {
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      ABI,
      getSigner()
    )

    try {
      const tx = await contract.follow([id], [0x0])
      await tx.wait()
      console.log(`successfully followed ... ${profile.handle}`)
    } catch (err) {
      console.log('error: ', err)
    }
  }

  if (!profile) return null

  return (
    <div>
      <div style={profileContainerStyle}>
        {
          !connected && (
            <button onClick={connectWallet}>Sign In</button>
          )
        }
        <Image
          width="200"
          height="200"
          alt={profile.handle}
          src={profile.picture?.original?.url}
        />
        <h1>{profile.handle}</h1>
        {
            publications.map((pub, index) => (
              <div key={index} style={publicationContainerStyle}>
                <p>{pub.metadata.content}</p>
              </div>
            ))
        }
        {
          connected && (
            <button
              style={buttonStyle}
              onClick={followUser}
            >Follow {profile.handle}</button>
          )
        }
      </div>
    </div>
  )
}

const buttonStyle = {
  padding: '10px 30px',
  backgroundColor: 'white',
  color: 'rgba(0, 0, 0, .6)',
  cursor: 'pointer',
  borderRadius: '40px',
  fontWeight: 'bold'
}

const publicationContainerStyle = {
  padding: '20px 0px',
}

const profileContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  padding: '20px  60px'
}
```

### Testing it out

To run the app, run the following command:

```sh
npm run dev
```

### Next Steps

Now that you've built your first basic application, it's time to explore more of the Lens API!

Consider diving into authentication, modules, or learning about gasless transactions and the dispatcher.

Also consider adding the following features to your new app:

- Following a user
- Searching for users
- Creating a post
