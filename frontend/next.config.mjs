/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  transpilePackages: ['aws-amplify', '@aws-amplify/auth', '@aws-amplify/core'],
};
export default nextConfig;