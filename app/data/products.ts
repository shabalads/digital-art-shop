// app/data/products.ts

export type Product = {
  id: string;
  title: string;
  description?: string;
  category: string;
  price_digital: number;
  price_physical: number;
  badge?: string;
  tags?: string[];
  section_ids?: string[];   // ← new: which manually-curated sections this product belongs to
  bg_color: string;
  image_url?: string;
  images?: string[];
  printful_product_id?: string;
  printful_variants?: Record<string, string>;
  printify_variants?: Record<string, string>;
  gelato_variants?: Record<string, string>;
  digital_file_url?: string;
  active: boolean;
  created_at?: string;
  deleted_at?: string | null;
};

// Products per page on /shop. Shared (not defined in the client component)
// so the server page can tell when ?page=N is past the last page.
export const SHOP_PAGE_SIZE = 40;

// The columns a product card and its grid filters/sort actually use — never
// the long Etsy description or the print-provider variant maps. select('*')
// made every listing request pull ~1.4 MB from the database. Shared by /shop
// and the category pages so they can't drift apart.
export const LISTING_COLUMNS =
  'id,title,category,price_digital,price_physical,badge,tags,section_ids,room,bg_color,image_url,home_sort_order,sort_order,active,created_at';

// Listing grids (home, shop) only need card fields. Dropping the long
// Etsy description and the print-provider variant maps keeps those pages'
// HTML from carrying ~1.5 MB of serialized product data.
export function toListingProduct(p: Product): Product {
  const card = { ...p };
  delete card.description;
  delete card.printful_variants;
  delete card.printify_variants;
  delete card.gelato_variants;
  delete card.digital_file_url;
  return card;
}

export type Section = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
};

export const categories = ['All', 'Abstract', 'Botanical', 'Typography', 'Vintage', 'Minimal'];

export const mockProducts: Product[] = [
  { id: '1', title: 'Warm Oval Study', category: 'abstract', price_digital: 3.99, price_physical: 29.99, badge: 'New', bg_color: '#E8E2D8', active: true },
  { id: '2', title: 'Sage Leaf No. 4', category: 'botanical', price_digital: 3.99, price_physical: 29.99, badge: 'New', bg_color: '#D8E4DC', active: true },
  { id: '3', title: 'Live Slowly', category: 'typography', price_digital: 2.99, price_physical: 27.99, bg_color: '#F0EBE3', active: true },
  { id: '4', title: 'Violet Geometry', category: 'abstract', price_digital: 3.99, price_physical: 29.99, badge: 'Trending', bg_color: '#E2E0EC', active: true },
  { id: '5', title: 'Golden Hour', category: 'photography', price_digital: 4.99, price_physical: 34.99, bg_color: '#EDE8D0', active: true },
  { id: '6', title: 'Minimal Arc', category: 'abstract', price_digital: 2.99, price_physical: 27.99, badge: 'Staff pick', bg_color: '#E4E8EC', active: true },
  { id: '7', title: 'Eucalyptus Study', category: 'botanical', price_digital: 3.99, price_physical: 29.99, badge: 'New', bg_color: '#DCE8DC', active: true },
  { id: '8', title: 'Be Here Now', category: 'typography', price_digital: 2.99, price_physical: 27.99, bg_color: '#EDE8E4', active: true },
  { id: '9', title: 'Blush Petals', category: 'botanical', price_digital: 3.99, price_physical: 29.99, badge: 'Trending', bg_color: '#EDE0D8', active: true },
  { id: '10', title: 'Ink & Stone', category: 'abstract', price_digital: 3.99, price_physical: 29.99, bg_color: '#D8D8DC', active: true },
];

export const bestsellerProducts: Product[] = [
  { id: 'b1', title: 'Warm Oval Study', category: 'abstract', price_digital: 3.99, price_physical: 29.99, badge: 'Bestseller', bg_color: '#E8E2D8', active: true },
  { id: 'b2', title: 'Sage Leaf No. 4', category: 'botanical', price_digital: 3.99, price_physical: 29.99, badge: 'Bestseller', bg_color: '#D8E4DC', active: true },
  { id: 'b3', title: 'Live Slowly', category: 'typography', price_digital: 2.99, price_physical: 27.99, badge: 'Bestseller', bg_color: '#F0EBE3', active: true },
  { id: 'b4', title: 'Violet Geometry', category: 'abstract', price_digital: 3.99, price_physical: 29.99, badge: 'Bestseller', bg_color: '#E2E0EC', active: true },
  { id: 'b5', title: 'Golden Hour', category: 'photography', price_digital: 4.99, price_physical: 34.99, badge: 'Bestseller', bg_color: '#EDE8D0', active: true },
  { id: 'b6', title: 'Minimal Arc', category: 'abstract', price_digital: 2.99, price_physical: 27.99, badge: 'Bestseller', bg_color: '#E4E8EC', active: true },
  { id: 'b7', title: 'Eucalyptus Study', category: 'botanical', price_digital: 3.99, price_physical: 29.99, badge: 'Bestseller', bg_color: '#DCE8DC', active: true },
  { id: 'b8', title: 'Be Here Now', category: 'typography', price_digital: 2.99, price_physical: 27.99, badge: 'Bestseller', bg_color: '#EDE8E4', active: true },
  { id: 'b9', title: 'Blush Petals', category: 'botanical', price_digital: 3.99, price_physical: 29.99, badge: 'Bestseller', bg_color: '#EDE0D8', active: true },
  { id: 'b10', title: 'Morning Mist', category: 'minimal', price_digital: 2.99, price_physical: 27.99, badge: 'Bestseller', bg_color: '#E8EEF0', active: true },
];