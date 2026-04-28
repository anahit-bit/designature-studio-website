import { motion } from 'framer-motion';

// ─── Product data ─────────────────────────────────────────────────────────────
const SHOWCASE_PRODUCTS = [
  // SOFAS
  {
    id: 1,
    name: 'Eddy Sofa Performance Velvet',
    retailer: 'West Elm',
    price: '$879.20',
    category: 'Sofas',
    image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353545/1_y95xdr.webp',
  },
  {
    id: 2,
    name: 'Sanders Heather Gray 85.5\u2033W Sofa',
    retailer: 'Article',
    price: '$699.00',
    category: 'Sofas',
    image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353556/2_yr0zgm.webp',
  },
  {
    id: 3,
    name: 'Ceni 3 Seater Sofa',
    retailer: 'Article',
    price: '$899.00',
    category: 'Sofas',
    image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353556/3_tavpm4.webp',
  },
  // COFFEE TABLES
  {
    id: 4,
    name: 'Anton Coffee Table',
    retailer: 'West Elm',
    price: '$599.00',
    category: 'Coffee Tables',
    image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353556/4_dwcwnu.webp',
  },
  {
    id: 5,
    name: 'Suri Rectangular Coffee Table',
    retailer: 'Article',
    price: '$599.00',
    category: 'Coffee Tables',
    image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353556/5_qxzwzs.webp',
  },
  {
    id: 6,
    name: 'Raymond Coffee Table',
    retailer: 'Pottery Barn',
    price: '$1,799.00',
    category: 'Coffee Tables',
    image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353556/6_evdscn.webp',
  },
  // ARMCHAIRS
  {
    id: 7,
    name: 'Fillmore Chair Set of 2',
    retailer: 'West Elm',
    price: '$1,099.00',
    category: 'Armchairs',
    image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353555/7_pg0ovf.webp',
  },
  {
    id: 8,
    name: 'Bavel Mid-Century Lounge Chair',
    retailer: 'Article',
    price: '$999.00',
    category: 'Armchairs',
    image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353567/8_u4fu7z.webp',
  },
  {
    id: 9,
    name: 'Eisenman Leather Accent Armchair',
    retailer: 'Wayfair',
    price: '$429.99',
    category: 'Armchairs',
    image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353568/9_k4gfiy.webp',
  },
  // OTTOMAN & POUFS
  {
    id: 10,
    name: 'Square Brown Pouf',
    retailer: 'CB2',
    price: '$229.00',
    category: 'Ottoman \u0026 Poufs',
    image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353567/10_jmhnrp.webp',
  },
  {
    id: 11,
    name: 'Square Brown Pouf',
    retailer: 'CB2',
    price: '$229.00',
    category: 'Ottoman \u0026 Poufs',
    image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353567/11_ewhuv7.jpg',
  },
  {
    id: 12,
    name: 'Gaona Leather Pouf',
    retailer: 'Pottery Barn',
    price: '$399.00',
    category: 'Ottoman \u0026 Poufs',
    image: 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776353568/12_hji3il.webp',
  },
];

const HERO_IMAGE = 'https://res.cloudinary.com/dys2k5muv/image/upload/v1776352832/photo.jpg_xfnuou.jpg';

// ─── Animation ───────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: 'easeOut', delay: i * 0.06 },
  }),
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface Props {
  onRequestLogin: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ShoppingListShowcase({ onRequestLogin }: Props) {
  return (
    <div className="w-full bg-white border-t border-black/10">
      <div className="flex flex-col items-center px-8 md:px-12 py-10 gap-7 w-full max-w-[900px] mx-auto">

        {/* ── Header ── */}
        <motion.div
          custom={-1}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center w-full"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-black/65 mb-3">
            How it works
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight leading-tight text-black mb-3">
            From concept to cart
          </h2>
          <p className="text-sm md:text-[15px] text-black/75 leading-relaxed mx-auto max-w-xl">
            Our AI identified 4 key pieces in this room and found matching products from trusted
            retailers &#8212; no affiliate fees, just real products that fit the style.
          </p>
        </motion.div>

        {/* ── Hero image ── */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="w-full overflow-hidden"
          style={{ borderRadius: 12, maxHeight: 400 }}
        >
          <img
            src={HERO_IMAGE}
            alt="Living room concept"
            className="w-full object-cover"
            style={{ aspectRatio: '16/9', maxHeight: 400, objectFit: 'cover' }}
          />
        </motion.div>

        {/* ── Label ── */}
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex items-center gap-3 w-full"
        >
          <div className="h-px flex-1 bg-black/8" />
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-black/65 whitespace-nowrap">
            AI identified these pieces &#8595;
          </p>
          <div className="h-px flex-1 bg-black/8" />
        </motion.div>

        {/* ── Product grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
          {SHOWCASE_PRODUCTS.map((product, i) => (
            <motion.div
              key={product.id}
              custom={i + 2}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-20px' }}
              className="bg-white group hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
              style={{ border: '0.5px solid rgba(0,0,0,0.1)' }}
            >
              {/* Product image */}
              <div className="overflow-hidden bg-neutral-50" style={{ aspectRatio: '1/1' }}>
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </div>
              {/* Product info */}
              <div className="p-3 flex flex-col gap-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/65">
                  {product.category}
                </p>
                <p className="text-[12px] md:text-[13px] font-bold text-black leading-tight line-clamp-2">
                  {product.name}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[11px] text-black/70 uppercase tracking-[0.1em]">
                    {product.retailer}
                  </p>
                  <p className="text-[12px] md:text-[13px] font-bold text-black">
                    {product.price}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── CTA panel ── */}
        <motion.div
          custom={SHOWCASE_PRODUCTS.length + 2}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-col items-center gap-3 w-full bg-black/[0.03] border-t border-black/[0.06] pt-6 pb-5 -mx-8 px-8"
          style={{ width: 'calc(100% + 4rem)' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-black/65">
            Shop any interior
          </p>
          <button
            onClick={onRequestLogin}
            className="inline-flex items-center gap-2 bg-[#0047AB] text-white text-[11px] font-bold uppercase tracking-[0.25em] px-7 py-4 hover:bg-[#003d99] transition-colors"
          >
            Start for free &#8212; no card needed &#8594;
          </button>
          <p className="text-[12px] text-black/70 uppercase tracking-[0.2em]">
            Free &#183; 3 shopping lists &#183; PDF download
          </p>
        </motion.div>

      </div>
    </div>
  );
}
