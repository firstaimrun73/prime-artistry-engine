/**
 * Circle 2edit Add asset registry.
 * Emoji glyphs only — no remote image URLs.
 * Feeds search + structured prompt builder.
 */

export type AddAsset = {
  id: string;
  label: string;
  category: string;
  categoryLabel: string;
  keywords: string[];
  glyph: string;
  /** Natural-language descriptor for the inpaint prompt */
  generationDescriptor: string;
};

type Draft = {
  id: string;
  label: string;
  keywords: string[];
  glyph: string;
  generationDescriptor: string;
};

function cat(id: string, label: string, items: Draft[]): AddAsset[] {
  return items.map((it) => ({
    ...it,
    category: id,
    categoryLabel: label,
  }));
}

const ANIMALS: Draft[] = [
  { id: "dog", label: "Dog", keywords: ["dog", "puppy", "pet", "canine"], glyph: "🐕", generationDescriptor: "a realistic dog" },
  { id: "cat", label: "Cat", keywords: ["cat", "kitten", "pet", "feline"], glyph: "🐈", generationDescriptor: "a realistic cat" },
  { id: "bird", label: "Bird", keywords: ["bird", "avian", "sparrow"], glyph: "🐦", generationDescriptor: "a realistic small bird" },
  { id: "eagle", label: "Eagle", keywords: ["eagle", "bird", "raptor", "hawk"], glyph: "🦅", generationDescriptor: "a realistic eagle" },
  { id: "parrot", label: "Parrot", keywords: ["parrot", "bird", "macaw", "tropical"], glyph: "🦜", generationDescriptor: "a realistic parrot" },
  { id: "owl", label: "Owl", keywords: ["owl", "bird", "nocturnal"], glyph: "🦉", generationDescriptor: "a realistic owl" },
  { id: "pigeon", label: "Pigeon", keywords: ["pigeon", "dove", "bird"], glyph: "🕊️", generationDescriptor: "a realistic pigeon" },
  { id: "flamingo", label: "Flamingo", keywords: ["flamingo", "bird", "pink"], glyph: "🦩", generationDescriptor: "a realistic flamingo" },
  { id: "peacock", label: "Peacock", keywords: ["peacock", "bird", "feather"], glyph: "🦚", generationDescriptor: "a realistic peacock" },
  { id: "swan", label: "Swan", keywords: ["swan", "bird", "water"], glyph: "🦢", generationDescriptor: "a realistic swan" },
  { id: "penguin", label: "Penguin", keywords: ["penguin", "bird", "antarctic"], glyph: "🐧", generationDescriptor: "a realistic penguin" },
  { id: "chicken", label: "Chicken", keywords: ["chicken", "hen", "bird", "farm"], glyph: "🐔", generationDescriptor: "a realistic chicken" },
  { id: "rooster", label: "Rooster", keywords: ["rooster", "cock", "chicken", "bird"], glyph: "🐓", generationDescriptor: "a realistic rooster" },
  { id: "duck", label: "Duck", keywords: ["duck", "bird", "waterfowl"], glyph: "🦆", generationDescriptor: "a realistic duck" },
  { id: "raven", label: "Raven", keywords: ["raven", "crow", "bird", "black"], glyph: "🐦‍⬛", generationDescriptor: "a realistic raven" },
  { id: "horse", label: "Horse", keywords: ["horse", "stallion", "mare", "equine"], glyph: "🐴", generationDescriptor: "a realistic horse" },
  { id: "rabbit", label: "Rabbit", keywords: ["rabbit", "bunny", "pet", "hare"], glyph: "🐇", generationDescriptor: "a realistic rabbit" },
  { id: "hamster", label: "Hamster", keywords: ["hamster", "pet", "rodent"], glyph: "🐹", generationDescriptor: "a realistic hamster" },
  { id: "mouse", label: "Mouse", keywords: ["mouse", "rodent", "pet"], glyph: "🐭", generationDescriptor: "a realistic mouse" },
  { id: "guinea-pig", label: "Guinea pig", keywords: ["guinea pig", "cavy", "pet"], glyph: "🐹", generationDescriptor: "a realistic guinea pig" },
];

const REPTILES: Draft[] = [
  { id: "snake", label: "Snake", keywords: ["snake", "serpent", "reptile"], glyph: "🐍", generationDescriptor: "a realistic snake" },
  { id: "python", label: "Python", keywords: ["python", "snake", "constrictor"], glyph: "🐍", generationDescriptor: "a realistic python snake" },
  { id: "cobra", label: "Cobra", keywords: ["cobra", "snake", "hood"], glyph: "🐍", generationDescriptor: "a realistic cobra" },
  { id: "lizard", label: "Lizard", keywords: ["lizard", "reptile"], glyph: "🦎", generationDescriptor: "a realistic lizard" },
  { id: "iguana", label: "Iguana", keywords: ["iguana", "lizard", "reptile"], glyph: "🦎", generationDescriptor: "a realistic iguana" },
  { id: "gecko", label: "Gecko", keywords: ["gecko", "lizard", "reptile"], glyph: "🦎", generationDescriptor: "a realistic gecko" },
  { id: "turtle", label: "Turtle", keywords: ["turtle", "shell", "reptile"], glyph: "🐢", generationDescriptor: "a realistic turtle" },
  { id: "tortoise", label: "Tortoise", keywords: ["tortoise", "turtle", "land"], glyph: "🐢", generationDescriptor: "a realistic tortoise" },
  { id: "crocodile", label: "Crocodile", keywords: ["crocodile", "croc", "reptile"], glyph: "🐊", generationDescriptor: "a realistic crocodile" },
  { id: "alligator", label: "Alligator", keywords: ["alligator", "gator", "reptile"], glyph: "🐊", generationDescriptor: "a realistic alligator" },
];

const WILDLIFE: Draft[] = [
  { id: "lion", label: "Lion", keywords: ["lion", "big cat", "wildlife", "safari"], glyph: "🦁", generationDescriptor: "a realistic lion" },
  { id: "tiger", label: "Tiger", keywords: ["tiger", "big cat", "stripes"], glyph: "🐯", generationDescriptor: "a realistic tiger" },
  { id: "leopard", label: "Leopard", keywords: ["leopard", "big cat", "spots"], glyph: "🐆", generationDescriptor: "a realistic leopard" },
  { id: "cheetah", label: "Cheetah", keywords: ["cheetah", "big cat", "fast"], glyph: "🐆", generationDescriptor: "a realistic cheetah" },
  { id: "bear", label: "Bear", keywords: ["bear", "wildlife", "grizzly"], glyph: "🐻", generationDescriptor: "a realistic bear" },
  { id: "wolf", label: "Wolf", keywords: ["wolf", "canine", "wildlife"], glyph: "🐺", generationDescriptor: "a realistic wolf" },
  { id: "fox", label: "Fox", keywords: ["fox", "wildlife", "red fox"], glyph: "🦊", generationDescriptor: "a realistic fox" },
  { id: "deer", label: "Deer", keywords: ["deer", "stag", "wildlife"], glyph: "🦌", generationDescriptor: "a realistic deer" },
  { id: "elephant", label: "Elephant", keywords: ["elephant", "wildlife", "safari"], glyph: "🐘", generationDescriptor: "a realistic elephant" },
  { id: "giraffe", label: "Giraffe", keywords: ["giraffe", "wildlife", "safari"], glyph: "🦒", generationDescriptor: "a realistic giraffe" },
  { id: "zebra", label: "Zebra", keywords: ["zebra", "wildlife", "stripes"], glyph: "🦓", generationDescriptor: "a realistic zebra" },
  { id: "monkey", label: "Monkey", keywords: ["monkey", "primate", "wildlife"], glyph: "🐒", generationDescriptor: "a realistic monkey" },
  { id: "gorilla", label: "Gorilla", keywords: ["gorilla", "ape", "primate"], glyph: "🦍", generationDescriptor: "a realistic gorilla" },
  { id: "panda", label: "Panda", keywords: ["panda", "bear", "wildlife"], glyph: "🐼", generationDescriptor: "a realistic giant panda" },
  { id: "kangaroo", label: "Kangaroo", keywords: ["kangaroo", "australia", "wildlife"], glyph: "🦘", generationDescriptor: "a realistic kangaroo" },
  { id: "koala", label: "Koala", keywords: ["koala", "australia", "wildlife"], glyph: "🐨", generationDescriptor: "a realistic koala" },
  { id: "camel", label: "Camel", keywords: ["camel", "desert", "wildlife"], glyph: "🐫", generationDescriptor: "a realistic camel" },
  { id: "rhino", label: "Rhino", keywords: ["rhino", "rhinoceros", "wildlife"], glyph: "🦏", generationDescriptor: "a realistic rhinoceros" },
  { id: "hippo", label: "Hippo", keywords: ["hippo", "hippopotamus", "wildlife"], glyph: "🦛", generationDescriptor: "a realistic hippopotamus" },
  { id: "buffalo", label: "Buffalo", keywords: ["buffalo", "bison", "wildlife"], glyph: "🐃", generationDescriptor: "a realistic buffalo" },
];

const VEHICLES: Draft[] = [
  { id: "car", label: "Car", keywords: ["car", "auto", "sedan", "vehicle"], glyph: "🚗", generationDescriptor: "a realistic car" },
  { id: "suv", label: "SUV", keywords: ["suv", "car", "vehicle"], glyph: "🚙", generationDescriptor: "a realistic SUV" },
  { id: "motorcycle", label: "Motorcycle", keywords: ["motorcycle", "bike", "motorbike"], glyph: "🏍️", generationDescriptor: "a realistic motorcycle" },
  { id: "bicycle", label: "Bicycle", keywords: ["bicycle", "bike", "cycle"], glyph: "🚲", generationDescriptor: "a realistic bicycle" },
  { id: "scooter", label: "Scooter", keywords: ["scooter", "moped", "vehicle"], glyph: "🛴", generationDescriptor: "a realistic scooter" },
  { id: "truck", label: "Truck", keywords: ["truck", "lorry", "vehicle"], glyph: "🚚", generationDescriptor: "a realistic truck" },
  { id: "van", label: "Van", keywords: ["van", "vehicle"], glyph: "🚐", generationDescriptor: "a realistic van" },
  { id: "bus", label: "Bus", keywords: ["bus", "coach", "vehicle"], glyph: "🚌", generationDescriptor: "a realistic bus" },
  { id: "boat", label: "Boat", keywords: ["boat", "ship", "vessel"], glyph: "🚤", generationDescriptor: "a realistic boat" },
  { id: "sailboat", label: "Sailboat", keywords: ["sailboat", "yacht", "boat"], glyph: "⛵", generationDescriptor: "a realistic sailboat" },
  { id: "airplane", label: "Airplane", keywords: ["airplane", "plane", "aircraft"], glyph: "✈️", generationDescriptor: "a realistic airplane" },
  { id: "helicopter", label: "Helicopter", keywords: ["helicopter", "chopper", "aircraft"], glyph: "🚁", generationDescriptor: "a realistic helicopter" },
  { id: "train", label: "Train", keywords: ["train", "locomotive", "rail"], glyph: "🚂", generationDescriptor: "a realistic train" },
  { id: "taxi", label: "Taxi", keywords: ["taxi", "cab", "car"], glyph: "🚕", generationDescriptor: "a realistic taxi" },
];

const MUSIC: Draft[] = [
  { id: "guitar", label: "Guitar", keywords: ["guitar", "acoustic", "instrument", "music"], glyph: "🎸", generationDescriptor: "a realistic acoustic guitar" },
  { id: "electric-guitar", label: "Electric guitar", keywords: ["electric guitar", "guitar", "instrument"], glyph: "🎸", generationDescriptor: "a realistic electric guitar" },
  { id: "piano", label: "Piano", keywords: ["piano", "keyboard", "instrument"], glyph: "🎹", generationDescriptor: "a realistic piano" },
  { id: "drum", label: "Drum", keywords: ["drum", "drums", "percussion"], glyph: "🥁", generationDescriptor: "a realistic drum" },
  { id: "violin", label: "Violin", keywords: ["violin", "fiddle", "instrument"], glyph: "🎻", generationDescriptor: "a realistic violin" },
  { id: "saxophone", label: "Saxophone", keywords: ["saxophone", "sax", "instrument"], glyph: "🎷", generationDescriptor: "a realistic saxophone" },
  { id: "trumpet", label: "Trumpet", keywords: ["trumpet", "horn", "instrument"], glyph: "🎺", generationDescriptor: "a realistic trumpet" },
  { id: "microphone", label: "Microphone", keywords: ["microphone", "mic", "audio"], glyph: "🎤", generationDescriptor: "a realistic microphone" },
  { id: "speaker", label: "Speaker", keywords: ["speaker", "audio", "sound"], glyph: "🔊", generationDescriptor: "a realistic speaker" },
  { id: "headphones", label: "Headphones", keywords: ["headphones", "earphones", "audio"], glyph: "🎧", generationDescriptor: "a realistic pair of headphones" },
];

const OBJECTS: Draft[] = [
  { id: "phone", label: "Phone", keywords: ["phone", "smartphone", "mobile"], glyph: "📱", generationDescriptor: "a realistic smartphone" },
  { id: "laptop", label: "Laptop", keywords: ["laptop", "computer", "notebook"], glyph: "💻", generationDescriptor: "a realistic laptop computer" },
  { id: "camera", label: "Camera", keywords: ["camera", "dslr", "photo"], glyph: "📷", generationDescriptor: "a realistic camera" },
  { id: "watch", label: "Watch", keywords: ["watch", "wristwatch", "time"], glyph: "⌚", generationDescriptor: "a realistic wristwatch" },
  { id: "bag", label: "Bag", keywords: ["bag", "handbag", "purse"], glyph: "👜", generationDescriptor: "a realistic handbag" },
  { id: "backpack", label: "Backpack", keywords: ["backpack", "bag", "rucksack"], glyph: "🎒", generationDescriptor: "a realistic backpack" },
  { id: "chair", label: "Chair", keywords: ["chair", "seat", "furniture"], glyph: "🪑", generationDescriptor: "a realistic chair" },
  { id: "table", label: "Table", keywords: ["table", "desk", "furniture"], glyph: "🪑", generationDescriptor: "a realistic table" },
  { id: "lamp", label: "Lamp", keywords: ["lamp", "light", "furniture"], glyph: "💡", generationDescriptor: "a realistic lamp" },
  { id: "bottle", label: "Bottle", keywords: ["bottle", "drink", "water"], glyph: "🍾", generationDescriptor: "a realistic bottle" },
  { id: "cup", label: "Cup", keywords: ["cup", "mug", "drink"], glyph: "☕", generationDescriptor: "a realistic cup" },
  { id: "book", label: "Book", keywords: ["book", "novel", "read"], glyph: "📖", generationDescriptor: "a realistic book" },
  { id: "glasses", label: "Glasses", keywords: ["glasses", "spectacles", "eyewear"], glyph: "👓", generationDescriptor: "a realistic pair of glasses" },
  { id: "sunglasses", label: "Sunglasses", keywords: ["sunglasses", "shades", "eyewear"], glyph: "🕶️", generationDescriptor: "a realistic pair of sunglasses" },
  { id: "umbrella", label: "Umbrella", keywords: ["umbrella", "parasol"], glyph: "☂️", generationDescriptor: "a realistic umbrella" },
  { id: "key", label: "Key", keywords: ["key", "keys"], glyph: "🔑", generationDescriptor: "a realistic key" },
  { id: "clock", label: "Clock", keywords: ["clock", "time", "wall clock"], glyph: "🕐", generationDescriptor: "a realistic clock" },
  { id: "mirror", label: "Mirror", keywords: ["mirror", "reflection"], glyph: "🪞", generationDescriptor: "a realistic mirror" },
  { id: "vase", label: "Vase", keywords: ["vase", "pottery", "decor"], glyph: "🏺", generationDescriptor: "a realistic vase" },
  { id: "candle", label: "Candle", keywords: ["candle", "light", "wax"], glyph: "🕯️", generationDescriptor: "a realistic candle" },
  { id: "ball", label: "Ball", keywords: ["ball", "sphere", "sport"], glyph: "⚽", generationDescriptor: "a realistic ball" },
  { id: "basketball", label: "Basketball", keywords: ["basketball", "ball", "sport"], glyph: "🏀", generationDescriptor: "a realistic basketball" },
  { id: "football", label: "Football", keywords: ["football", "soccer", "ball"], glyph: "⚽", generationDescriptor: "a realistic football" },
  { id: "tennis-ball", label: "Tennis ball", keywords: ["tennis", "ball", "sport"], glyph: "🎾", generationDescriptor: "a realistic tennis ball" },
];

const FOOD: Draft[] = [
  { id: "pizza", label: "Pizza", keywords: ["pizza", "food", "italian"], glyph: "🍕", generationDescriptor: "a realistic pizza" },
  { id: "burger", label: "Burger", keywords: ["burger", "hamburger", "food"], glyph: "🍔", generationDescriptor: "a realistic hamburger" },
  { id: "cake", label: "Cake", keywords: ["cake", "dessert", "food"], glyph: "🍰", generationDescriptor: "a realistic cake" },
  { id: "coffee", label: "Coffee", keywords: ["coffee", "drink", "cup"], glyph: "☕", generationDescriptor: "a realistic cup of coffee" },
  { id: "ice-cream", label: "Ice cream", keywords: ["ice cream", "dessert", "food"], glyph: "🍦", generationDescriptor: "a realistic ice cream" },
  { id: "apple", label: "Apple", keywords: ["apple", "fruit", "food"], glyph: "🍎", generationDescriptor: "a realistic apple" },
  { id: "banana", label: "Banana", keywords: ["banana", "fruit", "food"], glyph: "🍌", generationDescriptor: "a realistic banana" },
  { id: "orange", label: "Orange", keywords: ["orange", "fruit", "food"], glyph: "🍊", generationDescriptor: "a realistic orange" },
  { id: "strawberry", label: "Strawberry", keywords: ["strawberry", "fruit", "food"], glyph: "🍓", generationDescriptor: "a realistic strawberry" },
  { id: "grape", label: "Grapes", keywords: ["grape", "grapes", "fruit"], glyph: "🍇", generationDescriptor: "realistic grapes" },
  { id: "sushi", label: "Sushi", keywords: ["sushi", "food", "japanese"], glyph: "🍣", generationDescriptor: "realistic sushi" },
  { id: "bread", label: "Bread", keywords: ["bread", "loaf", "food"], glyph: "🍞", generationDescriptor: "a realistic loaf of bread" },
  { id: "donut", label: "Donut", keywords: ["donut", "doughnut", "dessert"], glyph: "🍩", generationDescriptor: "a realistic donut" },
  { id: "wine", label: "Wine", keywords: ["wine", "glass", "drink"], glyph: "🍷", generationDescriptor: "a realistic glass of wine" },
  { id: "beer", label: "Beer", keywords: ["beer", "drink", "mug"], glyph: "🍺", generationDescriptor: "a realistic glass of beer" },
];

const NATURE: Draft[] = [
  { id: "tree", label: "Tree", keywords: ["tree", "nature", "plant"], glyph: "🌳", generationDescriptor: "a realistic tree" },
  { id: "palm", label: "Palm tree", keywords: ["palm", "tree", "tropical"], glyph: "🌴", generationDescriptor: "a realistic palm tree" },
  { id: "flower", label: "Flower", keywords: ["flower", "bloom", "nature"], glyph: "🌸", generationDescriptor: "a realistic flower" },
  { id: "rose", label: "Rose", keywords: ["rose", "flower", "red"], glyph: "🌹", generationDescriptor: "a realistic rose" },
  { id: "sunflower", label: "Sunflower", keywords: ["sunflower", "flower", "yellow"], glyph: "🌻", generationDescriptor: "a realistic sunflower" },
  { id: "plant", label: "Plant", keywords: ["plant", "potted", "nature"], glyph: "🪴", generationDescriptor: "a realistic potted plant" },
  { id: "cactus", label: "Cactus", keywords: ["cactus", "plant", "desert"], glyph: "🌵", generationDescriptor: "a realistic cactus" },
  { id: "rock", label: "Rock", keywords: ["rock", "stone", "nature"], glyph: "🪨", generationDescriptor: "a realistic rock" },
  { id: "fountain", label: "Fountain", keywords: ["fountain", "water", "nature"], glyph: "⛲", generationDescriptor: "a realistic fountain" },
  { id: "mushroom", label: "Mushroom", keywords: ["mushroom", "fungi", "nature"], glyph: "🍄", generationDescriptor: "a realistic mushroom" },
  { id: "leaf", label: "Leaf", keywords: ["leaf", "leaves", "nature"], glyph: "🍃", generationDescriptor: "a realistic leaf" },
  { id: "mountain", label: "Mountain", keywords: ["mountain", "peak", "nature"], glyph: "⛰️", generationDescriptor: "a realistic mountain" },
];

const PEOPLE_PROPS: Draft[] = [
  { id: "hat", label: "Hat", keywords: ["hat", "cap", "accessory"], glyph: "🎩", generationDescriptor: "a realistic hat" },
  { id: "cap", label: "Cap", keywords: ["cap", "baseball", "hat"], glyph: "🧢", generationDescriptor: "a realistic baseball cap" },
  { id: "crown", label: "Crown", keywords: ["crown", "royal", "accessory"], glyph: "👑", generationDescriptor: "a realistic crown" },
  { id: "scarf", label: "Scarf", keywords: ["scarf", "clothing", "accessory"], glyph: "🧣", generationDescriptor: "a realistic scarf" },
  { id: "tie", label: "Tie", keywords: ["tie", "necktie", "clothing"], glyph: "👔", generationDescriptor: "a realistic necktie" },
  { id: "shoe", label: "Shoe", keywords: ["shoe", "footwear", "sneaker"], glyph: "👟", generationDescriptor: "a realistic shoe" },
  { id: "boot", label: "Boot", keywords: ["boot", "footwear"], glyph: "🥾", generationDescriptor: "a realistic boot" },
  { id: "ring", label: "Ring", keywords: ["ring", "jewelry"], glyph: "💍", generationDescriptor: "a realistic ring" },
  { id: "necklace", label: "Necklace", keywords: ["necklace", "jewelry", "chain"], glyph: "📿", generationDescriptor: "a realistic necklace" },
];

const TECH: Draft[] = [
  { id: "drone", label: "Drone", keywords: ["drone", "quadcopter", "tech"], glyph: "🛸", generationDescriptor: "a realistic drone" },
  { id: "robot", label: "Robot", keywords: ["robot", "android", "tech"], glyph: "🤖", generationDescriptor: "a realistic robot" },
  { id: "tv", label: "TV", keywords: ["tv", "television", "screen"], glyph: "📺", generationDescriptor: "a realistic television" },
  { id: "keyboard", label: "Keyboard", keywords: ["keyboard", "computer", "typing"], glyph: "⌨️", generationDescriptor: "a realistic computer keyboard" },
  { id: "mouse-device", label: "Computer mouse", keywords: ["mouse", "computer", "peripheral"], glyph: "🖱️", generationDescriptor: "a realistic computer mouse" },
  { id: "tablet", label: "Tablet", keywords: ["tablet", "ipad", "device"], glyph: "📱", generationDescriptor: "a realistic tablet device" },
  { id: "gamepad", label: "Gamepad", keywords: ["gamepad", "controller", "console"], glyph: "🎮", generationDescriptor: "a realistic game controller" },
];

const SPORTS: Draft[] = [
  { id: "skateboard", label: "Skateboard", keywords: ["skateboard", "skate", "sport"], glyph: "🛹", generationDescriptor: "a realistic skateboard" },
  { id: "surfboard", label: "Surfboard", keywords: ["surfboard", "surf", "sport"], glyph: "🏄", generationDescriptor: "a realistic surfboard" },
  { id: "ski", label: "Ski", keywords: ["ski", "skiing", "sport"], glyph: "🎿", generationDescriptor: "a realistic pair of skis" },
  { id: "trophy", label: "Trophy", keywords: ["trophy", "award", "prize"], glyph: "🏆", generationDescriptor: "a realistic trophy" },
  { id: "medal", label: "Medal", keywords: ["medal", "award", "prize"], glyph: "🏅", generationDescriptor: "a realistic medal" },
];

export const ADD_ASSET_CATEGORIES: { id: string; label: string }[] = [
  { id: "animals", label: "Animals" },
  { id: "reptiles", label: "Reptiles" },
  { id: "wildlife", label: "Wildlife" },
  { id: "vehicles", label: "Vehicles" },
  { id: "music", label: "Music" },
  { id: "objects", label: "Objects" },
  { id: "food", label: "Food" },
  { id: "nature", label: "Nature" },
  { id: "accessories", label: "Accessories" },
  { id: "tech", label: "Tech" },
  { id: "sports", label: "Sports" },
];

export const ADD_ASSETS: AddAsset[] = [
  ...cat("animals", "Animals", ANIMALS),
  ...cat("reptiles", "Reptiles", REPTILES),
  ...cat("wildlife", "Wildlife", WILDLIFE),
  ...cat("vehicles", "Vehicles", VEHICLES),
  ...cat("music", "Music", MUSIC),
  ...cat("objects", "Objects", OBJECTS),
  ...cat("food", "Food", FOOD),
  ...cat("nature", "Nature", NATURE),
  ...cat("accessories", "Accessories", PEOPLE_PROPS),
  ...cat("tech", "Tech", TECH),
  ...cat("sports", "Sports", SPORTS),
];

export function findAddAsset(id: string | null | undefined): AddAsset | null {
  if (!id) return null;
  return ADD_ASSETS.find((a) => a.id === id) ?? null;
}

export function searchAddAssets(query: string, categoryId?: string | null): AddAsset[] {
  const q = query.trim().toLowerCase();
  let list = ADD_ASSETS;
  if (categoryId) list = list.filter((a) => a.category === categoryId);
  if (!q) return list;
  return list.filter((a) => {
    if (a.label.toLowerCase().includes(q)) return true;
    if (a.id.includes(q)) return true;
    if (a.categoryLabel.toLowerCase().includes(q)) return true;
    return a.keywords.some((k) => k.toLowerCase().includes(q));
  });
}

/**
 * Structured Add prompt for flux inpaint.
 * Asset descriptor + optional user detail → single clear instruction.
 */
export function buildAddPrompt(opts: {
  asset: AddAsset | null;
  userDetail: string;
}): string {
  const detail = opts.userDetail.trim();
  let subject: string;
  if (opts.asset && detail) {
    const lower = detail.toLowerCase();
    const labelLower = opts.asset.label.toLowerCase();
    if (lower.includes(labelLower) || opts.asset.keywords.some((k) => lower.includes(k))) {
      subject = detail;
    } else {
      subject = `${opts.asset.generationDescriptor}, specifically: ${detail}`;
    }
  } else if (opts.asset) {
    subject = opts.asset.generationDescriptor;
  } else if (detail) {
    subject = detail;
  } else {
    subject = "the requested object";
  }

  return [
    `Add ONLY ${subject} inside the white masked region.`,
    "Match perspective, camera angle, scale, lighting, color temperature, depth of field, and scene style.",
    "Match shadows and reflections when appropriate.",
    "Blend naturally with surrounding pixels.",
    "Preserve all unmasked pixels exactly.",
    "Do not remove or alter existing objects outside the mask.",
    "Do not change the background outside the mask.",
  ].join(" ");
}
