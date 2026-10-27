// scripts/lib/section-cues.ts
//
// Cue words for each category page (/shop/<slug>), used by
// scripts/propose-sections.ts to suggest sections for products that are in none.
// Matched as whole words against the product title (weight 3 per distinct cue) and
// the product-specific part of the description (weight 1, capped).
//
// Only general category nouns (animals, coastal items, flowers, ...). Cues were NOT
// added to fit particular products: tuning the list to the products it is then
// tested on would flatter the proposals.
// Deliberately generous: a cue list never decides anything alone, it only ranks
// candidates for a human to approve. Keys are the section slugs in
// app/data/categories.ts.

export const SECTION_CUES: Record<string, RegExp> = {
  'coastal-seaside': /\b(coast\w*|sea|seaside|ocean|beach\w*|shore\w*|nautical|sailboats?|sail\w*|yachts?|boats?|harbou?r|marsh|herons?|egrets?|mediterranean|amalfi|positano|nantucket|hamptons|lighthouse|surf\w*|waves?|tide|seashells?|shells?|marina|island|pier|dock|riviera|swim\w*|mermaid|fish|sardines?|cape cod|waterfront|lake|riverside|whales?|oysters?|umbrellas?)\b/,
  'wildflower-botanical': /\b(wildflowers?|flowers?|floral|botanicals?|bouquets?|blooms?|blossoms?|meadow|petals?|garden|leaf|leaves|plants?|fern|eucalyptus|roses?|peon(?:y|ies)|poppy|poppies|daisy|daisies|tulips?|hydrangeas?|lavender|sunflowers?|magnolia|orchids?|lil(?:y|ies)|cornflowers?|citrus|lemons?|fruits?|vase|greenery|foliage|herbs?|tropical|palm|bees?|trees?)\b/,
  'moody-dark-academia': /\b(moody|dark academia|academia|gothic|goth|victorian|baroque|occult|witch\w*|vampires?|castle|ravens?|skulls?|macabre|dark|gloomy|noir|library|candles?|moths?|chiaroscuro|dramatic|crow|storm|mysterious|brooding|owls?)\b/,
  'dopamine-colorful': /\b(dopamine|colou?rful|maximalist|vibrant|bright|bold|neon|rainbow|funky|eclectic|pop art|preppy|grandmillennial|vivid|saturated|playful|abstract)\b/,
  'animal-wall-art': /\b(cats?|kittens?|dogs?|puppy|tigers?|leopards?|lions?|zebras?|giraffes?|horses?|cows?|birds?|owls?|foxes|fox|deer|bears?|rabbits?|bunny|frogs?|butterfl(?:y|ies)|animals?|goose|ducks?|ducklings?|swans?|elephants?|monkeys?|heron|egret|wolf|wolves|retriever|feline|whales?|dragonfl(?:y|ies)|bees?|squirrels?|hedgehogs?|peacocks?|parrots?|flamingos?)\b/,
  'feminine-coquette': /\b(coquette|feminine|girly|girl|girls|ballet|bows?|ribbons?|pink|blush|pearls?|perfume|vanity|lady|ladies|woman|women|female|fashion|dollhouse|romantic|dainty|champagne|heels|elegant|glam\w*|chic)\b/,
  'celestial-dreamy': /\b(celestial|moon\w*|lunar|stars?|starry|stargazing|night sky|galaxy|cosmic|constellations?|zodiac|astrolog\w*|dreamy|sun|mystic\w*|angels?|clouds?|cloudscape|sky|dusk|twilight|midnight|aurora|eclipse)\b/,
  'vintage-countryside': /\b(vintage|antique|countryside|farmhouse|rustic|cottage\w*|rural|barn|pastoral|country|folk|retro|french|provence|tuscan|english|farm|woodland|forest|cabin|lodge|wheat|harvest)\b/,
  'western-cowboy': /\b(western|cowboys?|cowgirls?|desert|ranch|rodeo|saddle|boots?|southwest\w*|cactus|cacti|texas|wild west|frontier|lasso|stetson|hats?)\b/,
  'quirky-funny': /\b(funny|quirky|weird|humou?r\w*|absurd|silly|goofy|whimsical|kitsch|meme|parody|surreal|bigfoot|sasquatch|alien|goblins?|pooping|toilet|nun|skateboard\w*|cheeky|sassy|fun)\b/,
  'spooky-cozy-ghosts': /\b(ghosts?|spooky|halloween|witch\w*|haunted|pumpkins?|bats?|spirits?|skeletons?|cauldron|autumn|fall|creepy|spooktacular)\b/,
};
