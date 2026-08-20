// Logo AI dětem — robotí hlava v jahodovém kruhu.
export function Logo({ size = 44 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt="AI dětem"
      style={{ display: 'block', borderRadius: '50%' }}
    />
  );
}
