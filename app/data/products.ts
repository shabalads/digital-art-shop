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
