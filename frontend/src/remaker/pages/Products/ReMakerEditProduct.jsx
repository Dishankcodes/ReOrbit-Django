import React from "react";
import { Link, useParams } from "react-router-dom";
import { PackageSearch } from "lucide-react";

import ProductForm from "../../components/ProductForm";
import { getProductById } from "../../data/remakerProducts";

import "../../css/ReMakerProductForm.css";

export default function ReMakerEditProduct() {
  const { productId } = useParams();
  const product = getProductById(productId);

  if (!product) {
    return (
      <section className="rpf">
        <div className="rpf-card rpf-missing">
          <PackageSearch size={34} strokeWidth={1.6} />
          <h2>We couldn&apos;t find that product</h2>
          <p>It may have been moved, or the link is out of date.</p>
          <Link to="/remaker-products" className="rpf-btn primary">
            Go to your products
          </Link>
        </div>
      </section>
    );
  }

  /* key resets the form when switching between products */
  return <ProductForm key={product.id} mode="edit" product={product} />;
}
