import parse, { domToReact, type HTMLReactParserOptions, type DOMNode } from "html-react-parser";
import DOMPurify from "dompurify";
import { useMemo } from "react";
import MountainRefCard from "./MountainRefCard";

interface Props {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}

const RenderMagazineHtml = ({ html, className, style }: Props) => {
  const sanitized = useMemo(() => {
    return DOMPurify.sanitize(html || "", {
      ALLOWED_TAGS: [
        "p", "br", "strong", "em", "u", "h2", "h3", "ul", "ol", "li",
        "blockquote", "a", "img", "span", "div", "hr",
      ],
      ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "style", "data-mountain-id", "data-name", "class"],
      ALLOW_DATA_ATTR: true,
    });
  }, [html]);

  const options: HTMLReactParserOptions = {
    replace: (node) => {
      const dn = node as DOMNode & { name?: string; attribs?: Record<string, string>; children?: DOMNode[] };
      if (dn.name === "span" && dn.attribs?.["data-mountain-id"]) {
        const id = Number(dn.attribs["data-mountain-id"]);
        if (Number.isFinite(id)) return <MountainRefCard mountainId={id} compact />;
      }
      // Strip inline scripts / events by ignoring (DOMPurify already removes most)
      return undefined;
    },
  };

  return (
    <div className={`magazine-rich ${className || ""}`} style={style}>
      {parse(sanitized, options) as any}
    </div>
  );
};

export default RenderMagazineHtml;
