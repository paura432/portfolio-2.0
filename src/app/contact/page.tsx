import type { Metadata } from "next";
import { ContactContent } from "@/components/portfolio/ContactContent";
import { SiteFrame } from "@/components/portfolio/SiteFrame";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <SiteFrame>
      <ContactContent headingLevel={1} />
    </SiteFrame>
  );
}
