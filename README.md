## Lens Protocol Workshop

In this video you'll learn how to use Next.js and Lens Protocol to build out a basic social media application.

### Getting started

To get started, create a new Next.js application:

```sh
npx create-next-app lens-app
```

Next, change into the new directory and install the following dependencies:

```sh
cd lens-app

npm install ethers graphql urql
```

Now we need to configure Next.js to allow IPFS and other file sources. To do so, open `next.config.js` and replace what's there with the following code:

```
/** @type {import('next').NextConfig} */
const nextConfig = {
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

Next, we'll create our first query. This query will return profiles recommended to us by the Lens API.

In `api.js`, add the following code at the bottom of the file:

```javascript
export const exploreProfiles = `
  query ExploreProfiles {
    exploreProfiles(request: { sortCriteria: MOST_FOLLOWERS }) {
      items {
        id
        name
        bio
        isDefault
        attributes {
          displayType
          traitType
          key
          value
        }
        followNftAddress
        metadata
        handle
        picture {
          ... on NftImage {
            contractAddress
            tokenId
            uri
            chainId
            verified
          }
          ... on MediaSet {
            original {
              url
              mimeType
            }
          }
        }
        coverPicture {
          ... on NftImage {
            contractAddress
            tokenId
            uri
            chainId
            verified
          }
          ... on MediaSet {
            original {
              url
              mimeType
            }
          }
        }
        ownedBy
        dispatcher {
          address
          canUseRelay
        }
        stats {
          totalFollowers
          totalFollowing
          totalPosts
          totalComments
          totalMirrors
          totalPublications
          totalCollects
        }
        followModule {
          ... on FeeFollowModuleSettings {
            type
            contractAddress
            amount {
              asset {
                name
                symbol
                decimals
                address
              }
              value
            }
            recipient
          }
          ... on ProfileFollowModuleSettings {
          type
          }
          ... on RevertFollowModuleSettings {
          type
          }
        }
      }
      pageInfo {
        prev
        next
        totalCount
      }
    }
  }
`
```

### Fetching publication data

Next, we'll create a query to fetch publications for each user.

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
    name
    description
    content
    media {
      original {
        ...MediaFields
      }
    }
    attributes {
      displayType
      traitType
      value
    }
  }
  fragment MediaFields on Media {
    url
    mimeType
  }
`
```

## Index.js

Next, let's query for profiles and render then in our app.

To do so, open `index.js` and add the following code:

```javascript
import { useState, useEffect } from 'react'
import {
  client, exploreProfiles, getPublications
} from '../api'
import Image from 'next/image'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

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
    <div className={styles.container}>
      <div>
          {
            profiles.map((profile, index) => (
              <Link href={`/profile/${profile.id}`} key={index}>
                <a>
                  {
                    profile.picture ? (
                      <Image
                        src={profile.picture.original?.url || "https://source.unsplash.com/random/200x200?sig=1"}
                        width="52px"
                        height="52px"
                      />
                    ) : <div style={blankPhotoStyle} />
                  }
                  <p>{profile.handle}</p>
                  <p >{profile.publication?.metadata.content}</p>
                </a>
              </Link>
            ))
          }
        </div>
    </div>
  )
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

Open `api.js` and add the following query:

```javascript
export const getProfile = `
query Profile($id: ProfileId!) {
  profile(request: { profileId: $id }) {
    id
    name
    bio
    attributes {
      displayType
      traitType
      key
      value
    }
    followNftAddress
    metadata
    isDefault
    picture {
      ... on NftImage {
        contractAddress
        tokenId
        uri
        verified
      }
      ... on MediaSet {
        original {
          url
          mimeType
        }
      }
      __typename
    }
    handle
    coverPicture {
      ... on NftImage {
        contractAddress
        tokenId
        uri
        verified
      }
      ... on MediaSet {
        original {
          url
          mimeType
        }
      }
      __typename
    }
    ownedBy
    dispatcher {
      address
      canUseRelay
    }
    stats {
      totalFollowers
      totalFollowing
      totalPosts
      totalComments
      totalMirrors
      totalPublications
      totalCollects
    }
    followModule {
      ... on FeeFollowModuleSettings {
        type
        amount {
          asset {
            symbol
            name
            decimals
            address
          }
          value
        }
        recipient
      }
      ... on ProfileFollowModuleSettings {
        type
      }
      ... on RevertFollowModuleSettings {
        type
      }
    }
  }
}
`

```


### Adding the ABI

Next, we'll need the ABI from the contract we'll be interacting with to allow users to follow other users.

Create a file named `abi.json` at the root of the project.

Next, copy the ABI located [here](https://polygonscan.com/address/0x20f4D7DdeE23029048C53B42dc73A02De19F1c9E#ddExportABI) into this file and save it.

### Profile view

In the `pages` directory, create a new folder named `profile` and a file in that directory named `[id].js`.

In this file, add the following code:

```javascript
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { ethers } from 'ethers'
import Image from 'next/image'
import { client, getPublications, getProfile } from '../../api'
import ABI from '../../abi.json'

const CONTRACT_ADDRESS = '0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d'

export default function Profile() {
  const [profile, setProfile] = useState()
  const [connected, setConnected] = useState()
  const [publications, setPublications] = useState([])
  const [account, setAccount] = useState('')
  const router = useRouter()
  const { id } = router.query

  useEffect(() => {
    if (id) {
      fetchProfile()
    }
    checkConnection()
  }, [id])

  async function checkConnection() {
    const provider = new ethers.providers.Web3Provider(
      (window).ethereum
    )
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
          width="200px"
          height="200px"
          src={profile.picture?.original?.url}
        />
        <p>{profile.handle}</p>
        {
            publications.map((pub, index) => (
              <div key={index}>
                <p>{pub.metadata.content}</p>
              </div>
            ))
        }
        {
          connected && (
            <button onClick={followUser}>Follow User</button>
          )
        }
      </div>
    </div>
  )
}

const profileContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start'
}
```