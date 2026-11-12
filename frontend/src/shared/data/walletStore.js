import { useCallback, useEffect, useRef, useState } from "react";

import { walletApi } from "../../api/payouts";
import { getAccount } from "../../api/session";

/* Wallet state for the signed-in member or ReMaker.
   Shows the last known numbers at once and refreshes quietly (no polling), so the
   page never sits blank and the server is asked once per visit. */
const cache = { key: "", summary: null };

const keyOf = () => {
  const a = getAccount();
  return a ? String(a.public_id || a.id || "") : "";
};

export function useWallet() {
  const key = keyOf();
  if (cache.key !== key) {
    cache.key = key;
    cache.summary = null;
  }
  const [summary, setSummary] = useState(cache.summary);
  const [error, setError] = useState("");
  const alive = useRef(true);

  const reload = useCallback(() => {
    setError("");
    return walletApi
      .summary()
      .then((data) => {
        cache.summary = data;
        if (alive.current) setSummary(data);
        return data;
      })
      .catch((e) => {
        if (alive.current) setError(e.message || "Could not load your wallet.");
      });
  }, []);

  useEffect(() => {
    alive.current = true;
    reload();
    return () => {
      alive.current = false;
    };
  }, [reload]);

  return { summary, error, reload, loading: !summary && !error };
}

/* A paged list (ledger or payouts) with "Load more". */
export function usePagedList(fetcher, params = "") {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const alive = useRef(true);

  const load = useCallback(
    (p, replace) => {
      setState((s) => (replace ? "loading" : s));
      fetcher(`?page=${p}&page_size=20${params ? `&${params}` : ""}`)
        .then((d) => {
          if (!alive.current) return;
          setRows((cur) => (replace ? d.results : [...cur, ...d.results]));
          setPage(p);
          setMore(p < d.total_pages);
          setState("ready");
        })
        .catch((e) => {
          if (!alive.current) return;
          setError(e.message || "Could not load.");
          setState("error");
        });
    },
    [fetcher, params],
  );

  useEffect(() => {
    alive.current = true;
    load(1, true);
    return () => {
      alive.current = false;
    };
  }, [load]);

  return {
    rows,
    more,
    state,
    error,
    reload: () => load(1, true),
    loadMore: () => load(page + 1, false),
    loadingMore: false,
  };
}
