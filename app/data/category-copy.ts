// app/data/category-copy.ts
//
// Hand-written copy for each category page (/shop/<slug>). Keyed by the same
// slug as CATEGORY_LINKS in categories.ts.
//
// - title:       <h1> and <title> (the site template appends " | ItemssyPrints",
//                so keep it short enough that the whole title stays under ~60).
// - description: meta description, one unique sentence pair, <= 160 characters.
// - intro:       100-150 words, shown above the grid on page 1 only. Written for
//                the category, not lifted from product listings, and it must not
//                repeat between categories — duplicate intros are what make
//                category pages look thin. Avoid stating product counts here
//                (they go stale); the page shows the live count itself.
//
// scripts/check-category-content.ts enforces the length and uniqueness rules.

export type CategoryCopy = { title: string; description: string; intro: string };

export const CATEGORY_COPY: Record<string, CategoryCopy> = {
  'coastal-seaside': {
    title: 'Coastal & Seaside Wall Art Prints',
    description: 'Digital coastal wall art: marsh herons, poppy fields by the sea, sailboats and sunlit Mediterranean windows. Instant download or printed and shipped.',
    intro:
      "Our coastal prints are about the feeling of being near water, not the usual anchors-and-seashells decor. You'll find hazy marsh herons and egrets in pastel light, poppy fields running down to the ocean, sailboats drifting past pink hydrangeas, and bright Fauvist beach scenes in teal and yellow. Others borrow the glamour of the Mediterranean, with open windows that frame yachts and turquoise water. Palettes lean soft and sun-faded, so a print sits happily in a bedroom, bathroom or hallway without fighting the rest of the room. Not sure where to start? Pair one calm bird study with one livelier seascape and you have a gallery wall that feels like a holiday. Download instantly, or order a printed copy shipped to your door.",
  },

  'wildflower-botanical': {
    title: 'Wildflower & Botanical Wall Art Prints',
    description: 'Printable wildflower and botanical wall art: meadow landscapes, vase still lifes, retro bouquets and citrus studies. Instant download or printed and shipped.',
    intro:
      "This is the largest corner of the shop, and the most varied. Quiet tastes gravitate to white wildflowers in a plain vase, neutral oil-style florals and soft pastel meadows that suit a Japandi or farmhouse bedroom. If you want more energy, try the alpine meadows at sunset, the retro bouquets in Matisse-inspired color, or a bold floral vase that can act as the one loud piece in a room. Fruit and citrus studies belong in a kitchen, and the sets of three are handy when you want a matching trio above a bed or sofa. Every print downloads instantly in five sizes and is made to be printed at home or at a local print shop, so you can test a size on your wall before buying a frame.",
  },

  'moody-dark-academia': {
    title: 'Moody & Dark Academia Wall Art Prints',
    description: 'Dark academia and moody wall art prints: gothic castles, moonlit skies, jewel-tone florals and vintage portraits. Instant download or printed and shipped.',
    intro:
      "Moody art is the opposite of beige. These prints use deep teal, burgundy, ink black and tarnished gold to make a room feel like a private library after dark. Expect jewel-tone peonies against shadowy backgrounds, gothic castles in oil-painting style, storm clouds breaking over a dark sea, and portraits of women in Victorian dress or holding books. Florals appear here too, but they look dramatic rather than sweet, which is why they pair so well with dark wood, brass lamps and shelves of old hardbacks. Hang one large piece above a desk or headboard, or cluster smaller ones in matching frames for a salon-style wall. Each design is an instant download in five print sizes, and printed copies can be shipped if you would rather skip the printer.",
  },

  'dopamine-colorful': {
    title: 'Dopamine & Colorful Wall Art Prints',
    description: 'Bright maximalist wall art in pink, orange and red: bold florals, textured abstracts, tiger portraits, retro bouquets. Instant download or printed and shipped.',
    intro:
      "If your walls feel too quiet, start here. Dopamine decor rests on one idea: surround yourself with color that makes you smile. This collection gathers saturated florals in hot pink and orange, textured abstracts, retro bouquets, striped-dress portraits and a swaggering tiger or two. Some are made to display on a Samsung Frame TV. Because the palettes are loud, they work best when you let one print lead and keep the rest of the room simple, although true maximalists will happily hang five. They suit apartments, dorm rooms, home offices and any space that needs a mood lift. Download instantly and print at home, or have a finished print delivered.",
  },

  'animal-wall-art': {
    title: 'Animal Wall Art Prints',
    description: 'Animal wall art prints: cats, tigers, leopards and farmyard birds in painterly, funny and folk-art styles. Instant digital download or printed and shipped.',
    intro:
      "Animal prints are the easiest way to give a room some personality. This section leans toward cats: a minimalist black-and-white silhouette, a sleepy orange cat on a green couch, a Frida-inspired portrait, and a few bathroom jokes for people who take their pets less seriously. Bigger cats appear as well, with tigers posed like fashion models and a leopard wearing a floral crown. For something gentler, look at the folk-art mother goose leading her ducklings, a good match for a nursery or farmhouse kitchen. The tone ranges from serious and painterly to openly silly, so decide on the mood before you choose a size. They make easy gifts for anyone devoted to their pet. Each one downloads instantly or can be ordered as a finished print.",
  },

  'feminine-coquette': {
    title: 'Feminine & Coquette Wall Art Prints',
    description: 'Feminine and coquette wall art: pink bathtubs, floral-crown portraits, pearls, shells and chic fashion art. Instant download or printed and shipped.',
    intro:
      "Coquette style is made of ribbons, blush tones and a knowing wink, and these prints take that mood seriously. Browse a pink clawfoot bathtub beneath a chandelier, a pearl resting in an oyster shell, champagne served in bed, and a woman lounging in pink heels. Quieter pieces include soft, neutral portraits of women in floral crowns, which suit an elegant bedroom or dressing room. There are bolder choices too, such as bright retro bouquets and striped portraits for a girly apartment. Bathrooms, closets, vanities and dorm rooms are the usual homes for this look, and a cluster of small prints works especially well above a vanity. Every design arrives as an instant digital download, ready to print in whichever size you need.",
  },

  'celestial-dreamy': {
    title: 'Celestial & Dreamy Wall Art Prints',
    description: 'Celestial wall art prints with moonlit skies, starry forests, gold-leaf stars and moths. Dreamy digital downloads, or printed and shipped to you.',
    intro:
      "Look up. The prints here are for people who find the night sky more interesting than the daytime one. You'll see moonlight over dark water, baroque storm clouds scattered with gold stars, starry pine forests, a sun arch ringed with botanical detail, and a moonlit river in teal and gold. Moths and other winged insects add a witchy, cottagecore edge, while the softer pieces trade drama for hazy light. The palettes of midnight blue, teal and warm gold look best in bedrooms, reading corners and stairwells where the light is low. Try hanging a pair side by side, one moon and one sun, for a balanced look. Download instantly and print at home, or order a finished print shipped to you.",
  },

  'vintage-countryside': {
    title: 'Vintage & Countryside Wall Art Prints',
    description: 'Vintage countryside wall art: farmhouse wildflower fields, rustic still lifes, woodland scenes and folk-art animals. Instant download or printed and shipped.',
    intro:
      "These prints look like they were found in a farmhouse attic, in the best way. The collection pairs weathered landscapes, such as burgundy wildflowers around a rural farmhouse, a cornflower meadow and a dark woodland, with muted still lifes of white hydrangeas, dried flowers and black vases. Folk-art touches show up in a mother goose leading her ducklings, and for a wink of humor there is a vintage Sasquatch fishing from a canoe that belongs on a cabin wall. The palette is muted and earthy, with faded greens, creams and the occasional deep burgundy. They suit cottages, farmhouse kitchens, hallways and anywhere you want a room to feel lived-in rather than styled. Instant downloads come in five sizes, and printed versions can be shipped directly to you.",
  },

  'western-cowboy': {
    title: 'Western & Cowboy Wall Art Prints',
    description: 'Western and cowboy wall art prints: cowgirl boots, vintage hats, coastal cowgirl scenes and funny frontier portraits. Instant download or printed and shipped.',
    intro:
      "Western decor has moved well beyond saddles and cattle brands, and this section shows it. The newest wave is coastal cowgirl: pink boots on the sand, a cowboy hat beside a surfboard, pink roses and cowgirl boots. Alongside that sits a vintage, mid-century strand with sepia hats and classic Western styling. Then there are the playful ones: a cowboy riding a dinosaur, a golden retriever in a cowboy hat, a cowboy holding a wildflower bouquet under a desert sky. Colors swing from bubblegum pink and sky blue to warm sepia browns, so there is something for a nursery, a dorm, a beach house or a rustic den. Get them as instant downloads, or have a printed copy shipped.",
  },

  'quirky-funny': {
    title: 'Quirky & Funny Wall Art Prints',
    description: 'Quirky and funny wall art prints: skateboarding nuns, fishing Bigfoot, kitchen goblins and cats in ramen shops. Instant download or printed and shipped.',
    intro:
      "Some walls need a conversation starter. This collection is for people who would rather have a skateboarding nun than another sunset. Expect vintage-style paintings with an absurd twist: Bigfoot paddling a canoe, a goblin lurking in a linocut kitchen, a surreal alien in a cottagecore forest, giraffes and zebras dressed in fashion, and a cat slurping noodles in a retro Japanese food poster. Several are meant for particular rooms, like the bathroom cats and the kitchen goblin, though nothing says they have to stay there. Funny art also makes a good housewarming or birthday gift, because it says something about the person who hangs it. Instant downloads and finished prints are both available.",
  },

  'spooky-cozy-ghosts': {
    title: 'Spooky & Cozy Ghost Wall Art Prints',
    description: 'Cozy ghost wall art prints: floral ghosts, a coffee-sipping spirit, greenhouse haunts and vintage Halloween scenes. Instant download or printed and shipped.',
    intro:
      "Friendly ghosts, not frightening ones. This small collection treats Halloween as a mood that can last all autumn, or all year if you like. One ghost sips coffee in a spot made for a kitchen or coffee bar, another hides in a cottagecore wildflower meadow, one tends plants in a greenhouse, and one reads the newspaper on the toilet, which belongs squarely in a bathroom. A sepia witch hat with a pumpkin and a vintage ghost with a black cat bring an antique feel, while a ghost forest under a crescent moon is moodier. The tone is cozy rather than creepy, and the muted palettes sit well in dark academia, cottagecore or witchy spaces. Instant downloads let you print in time for the season.",
  },
};
