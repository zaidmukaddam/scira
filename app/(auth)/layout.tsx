import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between h-screen">
      <div className="hidden lg:block lg:w-1/2 h-full bg-black">
        <Image
          src="/placeholder.png"
          alt="Placeholder"
          width={1000}
          height={1000}
          className="object-cover h-full w-full dark:grayscale"
        />
      </div>
      <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center px-2 md:px-0">{children}</div>
    </div>
  );
}
