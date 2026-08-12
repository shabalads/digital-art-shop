// app/data/customer-reviews.ts
//
// Seed source for the customer_reviews Supabase table — NOT read directly by
// the live site. The live gallery (app/components/CustomerReviewsGallery.tsx)
// fetches from Supabase via app/api/reviews/route.ts. This file is the input
// to scripts/seed-reviews.ts, which slugifies/renames the source images and
// inserts these 100 rows into Supabase. Kept here as typed, version-controlled
// documentation of the source dataset.
//
// Rows 1-51 only have order id / reviewer / product — no quote, rating, or
// date was captured for those in the original source list. That's expected,
// not missing data. Only rows 52-100 have quote/rating/date, and only those
// should ever get Review JSON-LD structured data (never fabricate a rating
// for 1-51).

export interface CustomerReview {
  id: number;              // 1-100, matches source image filename (e.g. "1.jpg")
  sourceImage: string;      // original filename before any rename pass
  orderId: string | null;   // Etsy order ID, or a slug if no order ID was visible
  reviewerName: string;
  productName: string;
  quote: string | null;      // null = no quote captured for this entry
  rating: number | null;     // null = unknown (true for all of ids 1-51)
  reviewDate: string | null; // as captured, e.g. "Apr 23, 2025"; null = unknown
}

export const customerReviews: CustomerReview[] = [
  { id: 1, sourceImage: "1.jpg", orderId: "3797218545", reviewerName: "Jeanmarie Paulo", productName: "Vintage Halloween Cat Ghost Witch Print", quote: null, rating: null, reviewDate: null },
  { id: 2, sourceImage: "2.jpg", orderId: "3784885396", reviewerName: "Heather Phillips", productName: "Ghost Drinking Coffee Wall Art", quote: null, rating: null, reviewDate: null },
  { id: 3, sourceImage: "3.jpg", orderId: "3786040869", reviewerName: "Tara Fleming", productName: "Colorful Abstract Bookshelf Art Print", quote: null, rating: null, reviewDate: null },
  { id: 4, sourceImage: "4.jpg", orderId: "3783118835", reviewerName: "nancy anderson", productName: "Colorful Flower Garden Wall Art", quote: null, rating: null, reviewDate: null },
  { id: 5, sourceImage: "5.jpg", orderId: "3779611312", reviewerName: "Ashley Beatty", productName: "Vintage Halloween Cat Ghost Witch Print", quote: null, rating: null, reviewDate: null },
  { id: 6, sourceImage: "6.jpg", orderId: "3777257437", reviewerName: "Danielle Elizabeth Gillean", productName: "Sailboats Pink Hydrangeas Painting", quote: null, rating: null, reviewDate: null },
  { id: 7, sourceImage: "7.jpg", orderId: "molly-dornseif", reviewerName: "Molly Dornseif", productName: "Dark Vintage Flowers Set of 3 (Halloween ver.)", quote: null, rating: null, reviewDate: null },
  { id: 8, sourceImage: "8.jpg", orderId: "mandy", reviewerName: "Mandy", productName: "Ghost Drinking Coffee Wall Art", quote: null, rating: null, reviewDate: null },
  { id: 9, sourceImage: "9.jpg", orderId: "3736623058", reviewerName: "Chariya", productName: "Coastal Cowgirl Art Print", quote: null, rating: null, reviewDate: null },
  { id: 10, sourceImage: "10.jpg", orderId: "3742974579", reviewerName: "Adriana D", productName: "Seaside Sailboat and Hydrangeas Print", quote: null, rating: null, reviewDate: null },
  { id: 11, sourceImage: "11.jpg", orderId: "coquette-bow", reviewerName: "(anonymous)", productName: "Neutral Girly Bow Wall Art", quote: null, rating: null, reviewDate: null },
  { id: 12, sourceImage: "12.jpg", orderId: "coquette-tulip", reviewerName: "(anonymous)", productName: "Trendy Coquette Tulip Room Decor", quote: null, rating: null, reviewDate: null },
  { id: 13, sourceImage: "13.jpg", orderId: "3727042932", reviewerName: "Millicent Maiden", productName: "Dark Vintage Flowers Set of 3 (Farmhouse ver.)", quote: null, rating: null, reviewDate: null },
  { id: 14, sourceImage: "14.jpg", orderId: "3730329237", reviewerName: "Holly Fugit", productName: "Jesus Leaves the 99", quote: null, rating: null, reviewDate: null },
  { id: 15, sourceImage: "15.jpg", orderId: "3726916727", reviewerName: "Mirjana Nevajdic", productName: "Sardine Painting", quote: null, rating: null, reviewDate: null },
  { id: 16, sourceImage: "16.jpg", orderId: "3724478677", reviewerName: "Ely Berry", productName: "Vintage Texas Sign Print", quote: null, rating: null, reviewDate: null },
  { id: 17, sourceImage: "17.jpg", orderId: "3724312121", reviewerName: "Jessica Misener", productName: "Abstract Blue Vintage Painting of Stars", quote: null, rating: null, reviewDate: null },
  { id: 18, sourceImage: "18.jpg", orderId: "emma-large-abstract", reviewerName: "Emma", productName: "Large Abstract Wall Art Print", quote: null, rating: null, reviewDate: null },
  { id: 19, sourceImage: "19.jpg", orderId: "3676816024", reviewerName: "Danielle Stanton", productName: "Blue Heron Marsh Fine Art Print", quote: null, rating: null, reviewDate: null },
  { id: 20, sourceImage: "20.jpg", orderId: "3674771609", reviewerName: "Marisol Avila", productName: "Jesus Christ Among Wildflowers", quote: null, rating: null, reviewDate: null },
  { id: 21, sourceImage: "21.jpg", orderId: "3660158802", reviewerName: "Vanessa", productName: "Celestial Night Court Print", quote: null, rating: null, reviewDate: null },
  { id: 22, sourceImage: "22.jpg", orderId: "3649966739", reviewerName: "Joelina", productName: "Colorful Wildflower Art Set of 3", quote: null, rating: null, reviewDate: null },
  { id: 23, sourceImage: "23.jpg", orderId: "3628647639", reviewerName: "Sara Senn", productName: "Victorian Ghost Art Poster Print", quote: null, rating: null, reviewDate: null },
  { id: 24, sourceImage: "24.jpg", orderId: "3628579887", reviewerName: "Traci J Watley", productName: "Vivid Disco Ball Maximalist Artwork", quote: null, rating: null, reviewDate: null },
  { id: 25, sourceImage: "25.jpg", orderId: "lacey-davis", reviewerName: "Lacey Davis", productName: "Blue Heron Marsh Fine Art Print", quote: null, rating: null, reviewDate: null },
  { id: 26, sourceImage: "26.jpg", orderId: "3618957365", reviewerName: "Beth Mayhew", productName: "Dark Vintage Flowers Set of 3 (Farmhouse ver.)", quote: null, rating: null, reviewDate: null },
  { id: 27, sourceImage: "27.jpg", orderId: "3607056070", reviewerName: "Kristen Hamrick", productName: "Sardine Watercolor Print", quote: null, rating: null, reviewDate: null },
  { id: 28, sourceImage: "28.jpg", orderId: "3608222335", reviewerName: "Laura", productName: "Vintage Star Gazing", quote: null, rating: null, reviewDate: null },
  { id: 29, sourceImage: "29.jpg", orderId: "surreal-big-eyes", reviewerName: "(anonymous)", productName: "Surreal Big Eyes Woman Portrait Print", quote: null, rating: null, reviewDate: null },
  { id: 30, sourceImage: "30.jpg", orderId: "moody-peony", reviewerName: "(anonymous)", productName: "Moody Peony Printable Wall Art", quote: null, rating: null, reviewDate: null },
  { id: 31, sourceImage: "31.jpg", orderId: "3888524547", reviewerName: "Julie R", productName: "Christmas Village Art Print", quote: null, rating: null, reviewDate: null },
  { id: 32, sourceImage: "32.jpg", orderId: "3884472115", reviewerName: "Claudia", productName: "Surreal Big Eyes Woman Portrait Print", quote: null, rating: null, reviewDate: null },
  { id: 33, sourceImage: "33.jpg", orderId: "3884027019", reviewerName: "Julie Rabe", productName: "Printable Christmas Wall Art Decor", quote: null, rating: null, reviewDate: null },
  { id: 34, sourceImage: "34.jpg", orderId: "3873296006", reviewerName: "Sarah", productName: "Vintage Christmas Bell Print", quote: null, rating: null, reviewDate: null },
  { id: 35, sourceImage: "35.jpg", orderId: "3872553782", reviewerName: "Crissy Hart", productName: "Jesus Christ Among Wildflowers", quote: null, rating: null, reviewDate: null },
  { id: 36, sourceImage: "36.jpg", orderId: "3874209271", reviewerName: "Tori Herzberg", productName: "Botanical Mushroom Print", quote: null, rating: null, reviewDate: null },
  { id: 37, sourceImage: "37.jpg", orderId: "rosan-bakker", reviewerName: "Rosan Bakker", productName: "Pastel Christmas Village Snow Scene Art Print", quote: null, rating: null, reviewDate: null },
  { id: 38, sourceImage: "38.jpg", orderId: "3868401271", reviewerName: "Pamela Hauer", productName: "Nativity Art Print Baby Jesus with Lambs", quote: null, rating: null, reviewDate: null },
  { id: 39, sourceImage: "39.jpg", orderId: "3854384272", reviewerName: "Krystal Whitley", productName: "Pastel Christmas Tree Wall Art", quote: null, rating: null, reviewDate: null },
  { id: 40, sourceImage: "40.jpg", orderId: "3851745939", reviewerName: "Wonders Unveiled", productName: "Ice Skating City Art Print", quote: null, rating: null, reviewDate: null },
  { id: 41, sourceImage: "41.jpg", orderId: "nadine-kostak", reviewerName: "Nadine Kostak", productName: "Pop Art Santa Wall Art Print", quote: null, rating: null, reviewDate: null },
  { id: 42, sourceImage: "42.jpg", orderId: "3833737909", reviewerName: "Sydnee Yates", productName: "Pastel Christmas Village Snow Scene Art Print", quote: null, rating: null, reviewDate: null },
  { id: 43, sourceImage: "43.jpg", orderId: "3828495658", reviewerName: "Beth Gillespie", productName: "Ghost Drinking Coffee Wall Art", quote: null, rating: null, reviewDate: null },
  { id: 44, sourceImage: "44.jpg", orderId: "terri-sailboats", reviewerName: "Terri", productName: "Sailboats and Pink Hydrangeas Print", quote: null, rating: null, reviewDate: null },
  { id: 45, sourceImage: "45.jpg", orderId: "3807537529", reviewerName: "Megan Williams", productName: "Ghost Drinking Coffee Wall Art", quote: null, rating: null, reviewDate: null },
  { id: 46, sourceImage: "46.jpg", orderId: "3799457038", reviewerName: "Briana Bet", productName: "Victorian Ghost Art Poster Print", quote: null, rating: null, reviewDate: null },
  { id: 47, sourceImage: "47.jpg", orderId: "3797090980", reviewerName: "Victoria j Seabeck", productName: "Vintage Halloween Cat Ghost Witch Print", quote: null, rating: null, reviewDate: null },
  { id: 48, sourceImage: "48.jpg", orderId: "sara-djermoun", reviewerName: "Sara Djermoun", productName: "Vibrant Abstract Pastel Art Print", quote: null, rating: null, reviewDate: null },
  { id: 49, sourceImage: "49.jpg", orderId: "sandra-abstract", reviewerName: "Sandra", productName: "Colorful Abstract Wall Art Print", quote: null, rating: null, reviewDate: null },
  { id: 50, sourceImage: "50.jpg", orderId: "morgan-butterfly", reviewerName: "Morgan", productName: "Pastel Butterfly Collection Illustration", quote: null, rating: null, reviewDate: null },
  { id: 51, sourceImage: "51.jpg", orderId: "maggie-ballet", reviewerName: "Maggie", productName: "Pink Ballet Shoes Wall Art", quote: null, rating: null, reviewDate: null },
  { id: 52, sourceImage: "52.jpg", orderId: "3577758014", reviewerName: "Maren Christensen", productName: "Jesus Leaves the 99", quote: "Great quality download/image quality! I got it printed and it's framed in my living room. Thank you!", rating: 5, reviewDate: "Apr 23, 2025" },
  { id: 53, sourceImage: "53.jpg", orderId: "3574223191", reviewerName: "Anna Leverence", productName: "Vintage Portrait | Oil Painting", quote: "This print is so beautiful! It's perfect in my guest room. I printed it through Walgreens in an 8x10.", rating: 5, reviewDate: "Jan 20, 2025" },
  { id: 54, sourceImage: "54.jpg", orderId: "3574223191", reviewerName: "Anna Leverence", productName: "Elegant Woman Portrait Print", quote: "This print is perfect in my guest bathroom. Simply ordered it through Walgreens and picked it up same day.", rating: 5, reviewDate: "Jan 20, 2025" },
  { id: 55, sourceImage: "55.jpg", orderId: "3566405812", reviewerName: "Shannon Hanscomb", productName: "Flowers Set of 3 Vintage Dark Prints (Halloween)", quote: "Pretty prints, made posters and they came out great!", rating: 5, reviewDate: "Feb 2, 2025" },
  { id: 56, sourceImage: "56.jpg", orderId: "3475392995", reviewerName: "Ruth Holmberg", productName: "Vibrant Turquoise and Pink Flowers Print", quote: "Just what I needed for this area!", rating: 5, reviewDate: "Nov 24, 2024" },
  { id: 57, sourceImage: "57.jpg", orderId: "3436142412", reviewerName: "Natalie", productName: "Ghost Drinking Coffee Wall Art", quote: "Easy download, instant gratification. Adorable coffee loving ghost. I'm obsessed", rating: 5, reviewDate: "Oct 1, 2024" },
  { id: 58, sourceImage: "58.jpg", orderId: "3423745929", reviewerName: "Shawn Phillips", productName: "Sardine Painting", quote: "Quick item and printed out great!", rating: 5, reviewDate: "Oct 30, 2024" },
  { id: 59, sourceImage: "59.jpg", orderId: "3411470882", reviewerName: "Sophia Badolato", productName: "Celestial Night Court Print", quote: "This print is so beautiful. I can't wait to display it above my headboard!", rating: 5, reviewDate: "Sep 12, 2024" },
  { id: 60, sourceImage: "60.jpg", orderId: "3325931283", reviewerName: "hannah robinette", productName: "Boho Butterflies Print", quote: "This was the perfect piece for my daughter's room. The seller was very quick and helpful when responding to my questions.", rating: 5, reviewDate: "Aug 20, 2024" },
  { id: 61, sourceImage: "61.jpg", orderId: "3311030839", reviewerName: "sophie hoge", productName: "Neutral Wildflowers Spring TV Art", quote: "Print came out perfect. Very pretty.", rating: 5, reviewDate: "Jun 20, 2024" },
  { id: 62, sourceImage: "62.jpg", orderId: "peony-master-bathroom-jul5", reviewerName: "(anonymous)", productName: "Vintage Flower Still Life Painting, Peony Wall Art", quote: "Pretty picture that I added to my master bathroom.", rating: 5, reviewDate: "Jul 5, 2024" },
  { id: 63, sourceImage: "63.jpg", orderId: "3298281871", reviewerName: "Kelsey Doebler", productName: "Colorful Wildflower Set of 3 Art Prints", quote: "Beautiful pics! Easy to download and printed at my local pharmacy.", rating: 5, reviewDate: "Jun 2, 2024" },
  { id: 64, sourceImage: "64.jpg", orderId: "3287917477", reviewerName: "(anonymous)", productName: "Green Wheat Field | Impressionist Painting", quote: "Looks excellent in my room", rating: 5, reviewDate: "May 14, 2024" },
  { id: 65, sourceImage: "65.jpg", orderId: "3291239778", reviewerName: "Harper", productName: "Spring Landscape Print | Cloudy Pink Sky", quote: "I blew this print up bigger than i thought would work and it is amazing. Can't wait to hang above my bed.", rating: 5, reviewDate: "May 7, 2024" },
  { id: 66, sourceImage: "66.jpg", orderId: "3265926357", reviewerName: "Mikaela", productName: "Flowers Set of 3 Vintage Dark Prints", quote: "Fast transaction and good quality prints.", rating: 5, reviewDate: "Apr 29, 2024" },
  { id: 67, sourceImage: "67.jpg", orderId: "3262696255", reviewerName: "Marina Shakulina", productName: "Vintage Japanese Print - Scandinavian Wall Art", quote: "Good quality! Printed it in size 50x70 cm", rating: 5, reviewDate: "May 21, 2024" },
  { id: 68, sourceImage: "68.jpg", orderId: "3257404315", reviewerName: "August Phillips", productName: "Peony Wall Art, Moody Dark Flower Print", quote: "So pretty. I purchased this art and used an online canvas store to make a 24x30 framed piece. I was worried about the resolution on a large print, but it is crisp and clear.", rating: 5, reviewDate: "May 5, 2024" },
  { id: 69, sourceImage: "69.jpg", orderId: "3239209337", reviewerName: "Emilie Léger", productName: "Colorful Wildflower Art Set of 3", quote: "Impeccable c'est magnifique. Très beau rendu.", rating: 5, reviewDate: "Mar 18, 2024" },
  { id: 70, sourceImage: "70.jpg", orderId: "3230083993", reviewerName: "(anonymous)", productName: "Timeless Stargazing / Vintage Star Gazing / Golden Moon Print / Vintage Moon and Stars (4 items, one order)", quote: "Beautiful", rating: 5, reviewDate: "Mar 12, 2024" },
  { id: 71, sourceImage: "71.jpg", orderId: "3229171265", reviewerName: "Debra Judd", productName: "Printable Wildflower Field Landscape Print", quote: "Beautiful print. Perfect for my Spring & Easter mantel.", rating: 5, reviewDate: "Mar 18, 2024" },
  { id: 72, sourceImage: "72.jpg", orderId: "3221047455", reviewerName: "April Brio", productName: "Colorful Wildflower Art Set of 3", quote: "Very cute! Just as pictured.", rating: 5, reviewDate: "Apr 18, 2024" },
  { id: 73, sourceImage: "73.jpg", orderId: "3224327408", reviewerName: "Nicholette Bleignier", productName: "Retro Peacock with Golden Ferns", quote: "Beautiful fit for my other pictures. Love the colors!", rating: 5, reviewDate: "Mar 14, 2024" },
  { id: 74, sourceImage: "74.jpg", orderId: "3215094937", reviewerName: "Mara Harriott", productName: "Wildflower Field Landscape Art Print", quote: "This print was everything I imagined and more for my daughters nursery. Had it printed through vista print and quality is great.", rating: 5, reviewDate: "May 2, 2024" },
  { id: 75, sourceImage: "75.jpg", orderId: "3223347798", reviewerName: "Madison Osborne", productName: "Colorful Wildflower Art Set of 3", quote: "I printed at Walgreens and the print quality is great!", rating: 5, reviewDate: "Feb 28, 2024" },
  { id: 76, sourceImage: "76.jpg", orderId: "3193812915", reviewerName: "Lindsey", productName: "Spring Landscape Print set of 2, Flowers landscape", quote: "Beautiful when printed and framed.", rating: 5, reviewDate: "Mar 16, 2024" },
  { id: 77, sourceImage: "77.jpg", orderId: "3187646784", reviewerName: "Allison Brown", productName: "Wildflower Field Landscape Art Print", quote: "Worked great in my bedroom. I printed it and had it up the same day I ordered the download!", rating: 5, reviewDate: "Mar 5, 2024" },
  { id: 78, sourceImage: "78.jpg", orderId: "3163687344", reviewerName: "Kim Novakoski", productName: "Vintage Black Cat Art Print", quote: "Picture is perfect. Was delivered immediately after purchase. Looks great with the rest of my cat art in the cats room!", rating: 5, reviewDate: "Jan 3, 2024" },
  { id: 79, sourceImage: "79.jpg", orderId: "3082729179", reviewerName: "Lisa Rigsby", productName: "Flowers Set of 3 Vintage Dark Prints", quote: "The prints look great on my green wall!", rating: 5, reviewDate: "Jan 21, 2024" },
  { id: 80, sourceImage: "80.jpg", orderId: "martha-russ", reviewerName: "Martha Russ", productName: "Vintage Art Print, Floral Wall Art, Vintage Botanical Illustration", quote: "Thank you! It is just what I had hoped for to put on my rose wallpaper.", rating: 5, reviewDate: "Oct 5, 2023" },
  { id: 81, sourceImage: "81.jpg", orderId: "3009980683", reviewerName: "Misty Buehlmaier", productName: "Wildflower Field Landscape Art Print", quote: "This is one of my favorite prints. I've used it in 3 clients homes and it's beautiful in each one.", rating: 5, reviewDate: "Dec 16, 2023" },
  { id: 82, sourceImage: "82.jpg", orderId: "beth-mayhew-2025", reviewerName: "Beth Mayhew", productName: "Dark Vintage Flowers Set of 3 Prints (Farmhouse)", quote: "The digital download arrived quickly and was easy to use.", rating: 5, reviewDate: "Mar 30, 2025" },
  { id: 83, sourceImage: "83.jpg", orderId: "3560715322", reviewerName: "Kelly Shea", productName: "Flowers Set of 3 Vintage Dark Prints (Halloween)", quote: "Soo beautiful! They look great in my living room!", rating: 5, reviewDate: "Feb 2, 2025" },
  { id: 84, sourceImage: "84.jpg", orderId: "3563523787", reviewerName: "Roxane Dennis", productName: "Jesus Leaves the 99", quote: "absolutely love it!!! seriously so beautiful! printed and framed by myself (:", rating: 5, reviewDate: "Jan 24, 2025" },
  { id: 85, sourceImage: "85.jpg", orderId: "3552271172", reviewerName: "Gabrielle Smith", productName: "Elegant Black Woman Wall Art", quote: "Came out beautiful! I got it printed with zazzle", rating: 5, reviewDate: "Jan 20, 2025" },
  { id: 86, sourceImage: "86.jpg", orderId: "3556285923", reviewerName: "Rosa Gaínza", productName: "Colorful Wildflower Art Set of 3", quote: "Los archivos que llegan ofrecen la posibilidad de imprimir en cualquier tamaño que se desee. Yo lo hice en 40x50 y me gusta mucho cómo ha quedado", rating: 5, reviewDate: "Jan 12, 2025" },
  { id: 87, sourceImage: "87.jpg", orderId: "3542048322", reviewerName: "Dina", productName: "Vintage Christmas Tree Print | Moody Antique Holiday Decor", quote: "Exactly what I was looking for! Printed beautifully! ❤️", rating: 5, reviewDate: "Dec 20, 2024" },
  { id: 88, sourceImage: "88.jpg", orderId: "vibrant-mountains-dec14", reviewerName: "(anonymous)", productName: "Vibrant Mountains Landscape Wall Art / Colorful Flower Garden Wall Art", quote: "Wonderful print and great quality on the larger print size.", rating: 5, reviewDate: "Dec 25, 2024" },
  { id: 89, sourceImage: "89.jpg", orderId: "3533531934", reviewerName: "Kristin Bendt", productName: "Sardine Painting", quote: "I love this print! So easy to find just the right high-quality image size for your project - I had mine printed, matted and framed through Mpix and it turned out so nice. Totally recommend!", rating: 5, reviewDate: "Jan 4, 2025" },
  { id: 90, sourceImage: "90.jpg", orderId: "3513523258", reviewerName: "Tara Willis", productName: "Vintage Gothic Black Cat in a Dress Poster", quote: "Immediately received and am having it framed as a gift!", rating: 5, reviewDate: "Dec 4, 2024" },
  { id: 91, sourceImage: "91.jpg", orderId: "3511936279", reviewerName: "Lexi", productName: "Printable Christmas Wall Art | Vintage Sleigh Painting", quote: "I Loved this so much! A great Christmas picture!", rating: 5, reviewDate: "Dec 3, 2024" },
  { id: 92, sourceImage: "92.jpg", orderId: "3495678529", reviewerName: "Jeannie Sabrina", productName: "Vintage Star Gazing", quote: "So so pretty. Makes a perfect gift for my family members gift basket. Thank you sm", rating: 5, reviewDate: "Dec 18, 2024" },
  { id: 93, sourceImage: "93.jpg", orderId: "3492931917", reviewerName: "Meghan (TheAnonymousDecoy)", productName: "Mystical Enchantment | Dark Autumn Forest", quote: "Printed beautifully. I love the pop of color it adds to my room.", rating: 5, reviewDate: "Dec 5, 2024" },
  { id: 94, sourceImage: "94.jpg", orderId: "meghan-nov20", reviewerName: "Meghan (TheAnonymousDecoy)", productName: "Vintage Starry Print | Night Sky Painting | Celestial Digital Art", quote: "Printed very nicely. I love the richness of the blues and oranges. The picture doesn't really do it justice. I was pleasantly surprised that the two night sky prints I purchased look so nice when side by side. Would definitely buy from this seller again.", rating: 5, reviewDate: "Dec 5, 2024" },
  { id: 95, sourceImage: "95.jpg", orderId: "3005455504", reviewerName: "(anonymous)", productName: "Wildflower Field Landscape / Spring Landscape Print / Pink Wildflower Field (3 items, one order)", quote: "I printed this as a poster at CVS and it is beautiful. You can still see the canvas texture even though it's a print. Lovely", rating: 5, reviewDate: "Sep 5, 2023" },
  { id: 96, sourceImage: "96.jpg", orderId: "2950342953", reviewerName: "Stacie", productName: "Vintage Star Gazing", quote: null, rating: 5, reviewDate: "Aug 1, 2023" },
  { id: 97, sourceImage: "97.jpg", orderId: "dawn-v-artezoid", reviewerName: "Dawn V (Artezoid)", productName: "Minimalist Japanese Wall Art - Scandinavian Wall Art", quote: "Nice digital file, I uploaded to framebridge to have it printed/framed for a client and the file was perfect, end product very nice.", rating: 5, reviewDate: "Jul 18, 2023" },
  { id: 98, sourceImage: "98.jpg", orderId: "2907537744", reviewerName: "(anonymous)", productName: "Abstract Botanical Flowers Print / Abstract Botanical Digital Download (3 items, one order)", quote: "Love the prints! Used sams club to get them printed and they look great!", rating: 5, reviewDate: "Jun 11, 2023" },
  { id: 99, sourceImage: "99.jpg", orderId: "2893262795", reviewerName: "(anonymous)", productName: "Vintage Spring Print | Printable Spring Wall Art (4 items, one order)", quote: "I bought 4 and they turned out spectacular. Excellent communication in getting the images downloaded to print.", rating: 5, reviewDate: "Jun 2, 2023" },
  { id: 100, sourceImage: "100.jpg", orderId: "2890251784", reviewerName: "Morgan Schmidt", productName: "Wildflower Field Landscape Art Print", quote: "It's beautiful!! The quality was great and I printed it 11x14", rating: 5, reviewDate: "May 13, 2023" },
];
