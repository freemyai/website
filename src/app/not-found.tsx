import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="section-block">
      <div className="container-site container-content">
        <p className="headline text-7xl md:text-8xl">404</p>
        <p className="text-muted-foreground mt-6 max-w-md text-lg">
          This path doesn&apos;t belong to Freemy yet.
        </p>
        <Link
          href="/"
          className={`${buttonVariants({ variant: "default" })} mt-8 h-11 rounded-lg px-5 font-semibold`}
        >
          Back home
        </Link>
      </div>
    </section>
  );
}
