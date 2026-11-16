import React from "react";
import { Link } from "react-router-dom";

/* Empty and error states shared by the customers pages. */

export function NoCustomers() {
  return (
    <section className="rod rsl">
      <div className="rod-empty">
        <div className="rod-empty-art single" aria-hidden="true">
          <img className="a" src="/images/users/meera-iyer.jpg" alt="" />
        </div>
        <h2>No customers yet</h2>
        <p>
          When someone buys one of your products, they will show up here with
          their order history.
        </p>
        <Link to="/remaker-products" className="rod-btn primary">
          Manage your products
        </Link>
      </div>
    </section>
  );
}

export function CustomersError({ message, onRetry }) {
  return (
    <section className="rod rsl">
      <div className="rod-empty" role="alert">
        <h2>We couldn&apos;t load your customers</h2>
        <p>{message}</p>
        <button type="button" className="rod-btn primary" onClick={onRetry}>
          Try again
        </button>
      </div>
    </section>
  );
}

export function CustomerNotFound() {
  return (
    <section className="rod rsl">
      <div className="rod-empty">
        <div className="rod-empty-art single" aria-hidden="true">
          <img className="a" src="/images/users/rohan-shah.jpg" alt="" />
        </div>
        <h2>We couldn&apos;t find that customer</h2>
        <p>They may not have bought from you, or the link is out of date.</p>
        <Link to="/remaker-customers" className="rod-btn primary">
          Back to customers
        </Link>
      </div>
    </section>
  );
}
