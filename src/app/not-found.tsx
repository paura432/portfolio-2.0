import Link from "next/link";
import { SiteFrame } from "@/components/portfolio/SiteFrame";

export default function NotFound() {
  return (
    <SiteFrame>
      <h1 className="text-2xl font-semibold">Off the map</h1>
      <p className="mt-2 text-muted">This district does not exist.</p>
      <Link href="/projects" className="btn btn-primary mt-6">
        View projects
      </Link>
    </SiteFrame>
  );
}
