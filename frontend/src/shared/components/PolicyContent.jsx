/* Renders a policy written in Admin › Content with the page's own styles.
   `prefix` is the page's class prefix ("privacy" or "terms"). */
import { useMemo } from "react";
import { parseBody } from "../../admin/data/contentStore";

const slug = (s) => String(s).toLowerCase().replace(/^\d+\.\s*/, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "section";

export function sectionsOf(body) {
  const sections = [];
  let cur = null;
  parseBody(body).forEach((b) => {
    if (b.type === "h") { cur = { id: slug(b.text), title: b.text, blocks: [] }; sections.push(cur); }
    else { if (!cur) { cur = { id: "overview", title: "Overview", blocks: [] }; sections.push(cur); } cur.blocks.push(b); }
  });
  return sections;
}

export const policyDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "");

export default function PolicyContent({ prefix, policy, contactTitle, contactText }) {
  const sections = useMemo(() => sectionsOf(policy?.body), [policy?.body]);
  const numbered = (t, i) => (/^\d+\./.test(t) ? t : `${i + 1}. ${t}`);
  return (
    <div className={`container ${prefix}-layout`}>
      <aside className={`${prefix}-sidebar`}>
        <span className={`${prefix}-sidebar-label`}>On this page</span>
        {sections.map((s) => <a key={s.id} href={`#${s.id}`}>{s.title.replace(/^\d+\.\s*/, "")}</a>)}
        <a href="#contact">Contact us</a>
      </aside>
      <main>
        {sections.map((s, i) => (
          <section className={`${prefix}-section`} id={s.id} key={s.id}>
            <h2>{numbered(s.title, i)}</h2>
            {s.blocks.map((b, j) =>
              b.type === "ul"
                ? <ul key={j}>{b.items.map((it, k) => <li key={k}>{it}</li>)}</ul>
                : <p key={j}>{b.text}</p>)}
          </section>
        ))}
        <section className={`${prefix}-section`} id="contact">
          <h2>{sections.length + 1}. Contact us</h2>
          <p>{contactText}</p>
          <div className={`${prefix}-contact`}>
            <div><h3>{contactTitle}</h3><p>Write to the ReOrbit team and we will get back to you.</p></div>
            <a href="/contact" className={`${prefix}-contact-button`}>Contact us <span className="material-symbols-outlined">arrow_forward</span></a>
          </div>
        </section>
      </main>
    </div>
  );
}
