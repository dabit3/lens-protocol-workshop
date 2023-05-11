/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: [
      'ipfs.infura.io',
      'statics-polygon-lens-staging.s3.eu-west-1.amazonaws.com',
      'lens.infura-ipfs.io',
      'source.unsplash.com',
      'arweave.net',
      'images.lens.phaver.com',
      ""
    ],
  },
}

module.exports = nextConfig