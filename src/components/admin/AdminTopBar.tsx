/**
 * Top bar shared across /admin and /admin/users (I-019b + I-020b).
 *
 * Renders the cobalt eyebrow + Cormorant product name on the left, and
 * a slot for status/links + a "Sign out" button on the right.
 */
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminLogout } from '../../lib/adminAuth';

interface Props {
  /** Cormorant title to the right of the eyebrow. */
  product: string;
  /** Optional element rendered to the LEFT of Sign out (e.g. "Live · polling 30s" or back link). */
  rightSlot?: React.ReactNode;
}

const AdminTopBar: React.FC<Props> = ({ product, rightSlot }) => {
  const navigate = useNavigate();

  async function onSignOut() {
    await adminLogout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="bg-white border-b border-[#DAD2C3] px-12 py-5 flex items-center justify-between font-body">
      <div className="text-[10px] tracking-[0.32em] uppercase text-[#0047AB] font-bold">
        Observability
        <Link
          to="/admin"
          className="ml-4 text-black font-serif text-[22px] font-medium tracking-tight align-middle no-underline hover:text-[#0047AB]"
        >
          {product}
        </Link>
      </div>
      <div className="flex items-center gap-6 text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-semibold">
        {rightSlot}
        <button
          type="button"
          onClick={onSignOut}
          className="text-black hover:text-[#0047AB]"
        >
          Sign out
        </button>
      </div>
    </div>
  );
};

export default AdminTopBar;
