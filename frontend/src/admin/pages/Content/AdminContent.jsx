import React from "react";
import { useSearchParams } from "react-router-dom";
import { Tags, ImagePlus, CircleHelp, ScrollText, History } from "lucide-react";

import { useCategories, useBanners, useFaqs, usePolicies, useContentLog } from "../../data/contentStore";
import { useAccess } from "../../data/teamStore";
import { formatDateTime } from "../../utils/format";
import useToast from "../../components/ui/useToast";

import CategoriesTab from "./components/CategoriesTab";
import BannersTab from "./components/BannersTab";
import FaqsTab from "./components/FaqsTab";
import PoliciesTab from "./components/PoliciesTab";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/content/AdminContent.css";

export default function AdminContent() {
  const [params, setParams] = useSearchParams();
  const access = useAccess();
  const { toast, toastNode } = useToast();
  const cats = useCategories();
  const banners = useBanners();
  const faqs = useFaqs();
  const policies = usePolicies();
  const log = useContentLog();

  const canEdit = access.can("content", "edit");
  const by = access.me?.name || "Admin";

  const TABS = [
    { key: "categories", label: "Categories", icon: Tags, badge: cats.length, note: `${cats.filter((c) => c.active).length} visible` },
    { key: "banners", label: "Banners", icon: ImagePlus, badge: banners.length, note: `${banners.filter((b) => b.status === "Live").length} live` },
    { key: "faqs", label: "FAQs", icon: CircleHelp, badge: faqs.length, note: `${faqs.filter((f) => f.published).length} published` },
    { key: "policies", label: "Policies", icon: ScrollText, badge: policies.length, note: `${policies.filter((p) => p.draft || p.neverPublished).length} need review` },
  ];
  const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "categories";
  const go = (key) => setParams(key === "categories" ? {} : { tab: key }, { replace: true });
  const props = { canEdit, by, toast };

  return (
    <div className="au-page cm-page">
      <nav className="cm-tabs" role="tablist" aria-label="Content sections">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? "on" : ""} onClick={() => go(t.key)}>
              <span className="cm-tab-ic"><Icon size={18} strokeWidth={1.8} /></span>
              <span className="cm-tab-t"><strong>{t.label} <em>{t.badge}</em></strong><small>{t.note}</small></span>
            </button>
          );
        })}
      </nav>

      <div role="tabpanel">
        {tab === "categories" && <CategoriesTab {...props} />}
        {tab === "banners" && <BannersTab {...props} />}
        {tab === "faqs" && <FaqsTab {...props} />}
        {tab === "policies" && <PoliciesTab {...props} />}
      </div>

      {log.length > 0 && (
        <section className="au-panel cm-log" aria-label="Recent changes">
          <h4><History size={15} /> Changes made in this session</h4>
          <ul>{log.slice(0, 6).map((l) => <li key={l.id}><span>{l.text}</span><small>{l.by} · {formatDateTime(l.at)}</small></li>)}</ul>
        </section>
      )}
      {toastNode}
    </div>
  );
}
