import React from "react";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-4">Terms &amp; Conditions</h1>
        <p className="text-sm text-gray-500 mb-8">
          Last updated: December 2025
        </p>

        <section className="space-y-6 text-sm leading-relaxed">
          <p>
            Welcome to <span className="font-semibold">ShopSphere</span>. This
            Terms &amp; Conditions page is part of a demo e-commerce project
            created for learning and practice. It is not a real store and does
            not represent an actual business.
          </p>

          <div>
            <h2 className="text-lg font-semibold mb-2">1. Demo Project Only</h2>
            <p>
              ShopSphere is a sample application built to experiment with
              features like product listing, cart, wishlist and orders. Any
              products, prices, or offers shown on this website are fictional
              and for demonstration only.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">2. No Real Payments</h2>
            <p>
              Even if you see buttons like &quot;Add to Cart&quot; or
              &quot;Checkout&quot;, they do not process any real payments.
              Please do not enter any sensitive payment information into this
              project.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">3. Test User Accounts</h2>
            <p>
              Any user accounts created on this platform are for testing
              purposes only. Use dummy data wherever possible and avoid using
              your personal passwords from other sites.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">4. Data &amp; Privacy</h2>
            <p>
              This project may temporarily store information such as your name,
              email, or address in a development database or local storage to
              simulate a real shopping experience. This data is only meant for
              local testing and can be deleted by clearing your browser storage
              or resetting the database.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">
              5. No Warranty or Liability
            </h2>
            <p>
              The project is provided &quot;as is&quot; without any warranty of
              any kind. The creator of this project is not responsible for any
              loss, damage, or issues caused by using or misusing this demo
              application.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">
              6. Changes to These Terms
            </h2>
            <p>
              Since this is a learning project, features and terms may change
              frequently as new concepts are implemented. By continuing to use
              the site, you accept that it is under active development.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">7. Contact</h2>
            <p>
              For any questions about this project, you can reach out at{" "}
              <span className="font-mono">support@shopsphere.com</span> (demo
              email).
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
