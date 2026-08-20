/** @type {import('next').NextConfig} */
const nextConfig = {
  // Zajistí, že soubory kritérií jsou zabaleny do serverless funkce na Vercelu.
  outputFileTracingIncludes: {
    // Glob, ať se na nový datový soubor nezapomene — chybějící soubor by shodil
    // chat až za běhu na Vercelu, ne při buildu.
    '/api/chat': ['./data/**'],
  },
};

export default nextConfig;
