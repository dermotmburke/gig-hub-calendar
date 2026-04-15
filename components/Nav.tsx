import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from './ThemeToggle';

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-4 bg-white dark:bg-black border-b-4 border-black dark:border-white">
      <Link href="/">
        <Image src="/logo.svg" alt="GIGHUB" width={120} height={26} priority className="dark:invert" />
      </Link>
      <div className="flex items-center gap-1 font-headline uppercase tracking-tighter font-bold text-black dark:text-white text-sm">
        <Link href="/" className="hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black px-3 py-1 transition-colors">
          UPCOMING
        </Link>
        <Link href="/gigs" className="hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black px-3 py-1 transition-colors">
          ALL GIGS
        </Link>
        <Link href="/calendar" className="hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black px-3 py-1 transition-colors">
          CALENDAR
        </Link>
        <ThemeToggle />
      </div>
    </nav>
  );
}
