/** @type {import('next').NextConfig} */
const nextConfig = {
  // Zajistí, že soubory kritérií jsou zabaleny do serverless funkce na Vercelu.
  outputFileTracingIncludes: {
    '/api/chat': ['./data/kriteria.json', './data/vychodiska.md'],
  },
};

export default nextConfig;
