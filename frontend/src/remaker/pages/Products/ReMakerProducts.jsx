import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, ImagePlus, Pencil, Plus, Search, ShoppingBag } from "lucide-react";

import {
  PRODUCT_STATUS,
  REMAKER_PRODUCTS,
  formatPrice,
} from "../../data/remakerProducts";

import "../../css/ReMakerProducts.css";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "draft", label: "Drafts" },
];

/* Sold_Out products are still "active" listings with no stock */
function bucket(product) {
  if (product.status === "Draft") return "draft";
  if (product.status === "Inactive") return "inactive";
  return "active";
}

export default function ReMakerProducts() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [products, setProducts] = useState(REMAKER_PRODUCTS);
  const [filter, setFilter] = useState("all");

  const query = (params.get("search") || "").trim().toLowerCase();

  const counts = useMemo(() => {
    const result = { all: products.length, active: 0, inactive: 0, draft: 0 };
    products.forEach((product) => {
      result[bucket(product)] += 1;
    });
    return result;
  }, [products]);

  const visible = products.filter((product) => {
    const matchesFilter = filter === "all" || bucket(product) === filter;
    const matchesQuery =
      !query ||
      product.title.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query);

    return matchesFilter && matchesQuery;
  });

  /* Active <-> Inactive only. Products are never deleted. */
  const toggleActive = (id) =>
    setProducts((current) =>
      current.map((product) => {
        if (product.id !== id || product.status === "Draft") return product;

        if (product.status === "Inactive") {
          return { ...product, status: product.stock === 0 ? "Sold_Out" : "Listed" };
        }

        return { ...product, status: "Inactive" };
      }),
    );

  return (
    <section className="rpl">
      <div className="rpl-toolbar">
        <div className="rpl-tabs" role="tablist" aria-label="Filter products">
          {FILTERS.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={filter === item.key}
              className={filter === item.key ? "active" : ""}
              key={item.key}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
              <span>{counts[item.key]}</span>
            </button>
          ))}
        </div>

        <Link to="/remaker-products/new" className="rpl-add">
          <Plus size={17} />
          Add product
        </Link>
      </div>

      {query && (
        <p className="rpl-query">
          <Search size={14} />
          Showing results for <strong>{params.get("search")}</strong>
          <button type="button" onClick={() => setParams({})}>
            Clear
          </button>
        </p>
      )}

      {visible.length === 0 ? (
        <div className="rpl-empty">
          <ShoppingBag size={34} strokeWidth={1.6} />
          <h2>{query ? "No products match your search" : "Nothing here yet"}</h2>
          <p>
            {query
              ? "Try a different word or clear the search."
              : "Products you add will show up here."}
          </p>
          <Link to="/remaker-products/new" className="rpl-add">
            <Plus size={17} />
            Add product
          </Link>
        </div>
      ) : (
        <div className="rpl-grid">
          {visible.map((product) => {
            const status = PRODUCT_STATUS[product.status];
            const isActive = product.status === "Listed" || product.status === "Sold_Out";
            const isDraft = product.status === "Draft";

            return (
              <article
                className={`rpl-card ${product.status === "Inactive" ? "is-off" : ""}`}
                key={product.id}
              >
                <Link
                  to={`/remaker-products/${product.id}/edit`}
                  className="rpl-media"
                  aria-label={`Edit ${product.title}`}
                >
                  {product.images[0] ? (
                    <img src={product.images[0]} alt="" loading="lazy" />
                  ) : (
                    <span className="rpl-noimg">
                      <ImagePlus size={26} />
                    </span>
                  )}
                  <span className={`rpl-badge ${status.tone}`}>{status.label}</span>
                </Link>

                <div className="rpl-body">
                  <span className="rpl-cat">{product.category}</span>
                  <h3>{product.title}</h3>

                  <div className="rpl-price-row">
                    <strong>{product.price ? formatPrice(product.price) : "No price yet"}</strong>
                    <span>
                      {isDraft
                        ? "Not published"
                        : product.stock === 0
                          ? "Out of stock"
                          : `${product.stock} in stock`}
                    </span>
                  </div>

                  <div className="rpl-stats">
                    <span>
                      <Eye size={14} />
                      {product.views.toLocaleString("en-IN")} views
                    </span>
                    <span>
                      <ShoppingBag size={14} />
                      {product.sales} sold
                    </span>
                  </div>

                  <div className="rpl-foot">
                    {isDraft ? (
                      <span className="rpl-draft-note">Finish it to publish</span>
                    ) : (
                      <label className="rpl-toggle">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isActive}
                          aria-label={`${product.title} is ${isActive ? "active" : "inactive"}`}
                          className={isActive ? "on" : ""}
                          onClick={() => toggleActive(product.id)}
                        >
                          <span />
                        </button>
                        {isActive ? "Active" : "Inactive"}
                      </label>
                    )}

                    <button
                      type="button"
                      className="rpl-edit"
                      onClick={() => navigate(`/remaker-products/${product.id}/edit`)}
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
