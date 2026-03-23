import { useEffect } from "react";

type DocumentMetadataProps = {
  title: string;
  description: string;
  canonicalPath?: string;
};

const DESCRIPTION_META_NAME = "description";
const CANONICAL_REL = "canonical";

const ensureDescriptionMeta = () => {
  let metaTag = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${DESCRIPTION_META_NAME}"]`,
  );

  if (!metaTag) {
    metaTag = document.createElement("meta");
    metaTag.name = DESCRIPTION_META_NAME;
    document.head.append(metaTag);
  }

  return metaTag;
};

const ensureCanonicalLink = () => {
  let linkTag = document.head.querySelector<HTMLLinkElement>(
    `link[rel="${CANONICAL_REL}"]`,
  );

  if (!linkTag) {
    linkTag = document.createElement("link");
    linkTag.rel = CANONICAL_REL;
    document.head.append(linkTag);
  }

  return linkTag;
};

export default function DocumentMetadata({
  title,
  description,
  canonicalPath,
}: DocumentMetadataProps) {
  useEffect(() => {
    const previousTitle = document.title;
    const descriptionMeta = ensureDescriptionMeta();
    const previousDescription = descriptionMeta.getAttribute("content");

    document.title = title;
    descriptionMeta.setAttribute("content", description);

    let canonicalLink: HTMLLinkElement | null = null;
    let previousCanonicalHref: string | null = null;

    if (canonicalPath) {
      canonicalLink = ensureCanonicalLink();
      previousCanonicalHref = canonicalLink.getAttribute("href");
      canonicalLink.setAttribute("href", new URL(canonicalPath, window.location.origin).toString());
    }

    return () => {
      document.title = previousTitle;

      if (previousDescription) {
        descriptionMeta.setAttribute("content", previousDescription);
      } else {
        descriptionMeta.removeAttribute("content");
      }

      if (canonicalLink) {
        if (previousCanonicalHref) {
          canonicalLink.setAttribute("href", previousCanonicalHref);
        } else {
          canonicalLink.remove();
        }
      }
    };
  }, [canonicalPath, description, title]);

  return null;
}
