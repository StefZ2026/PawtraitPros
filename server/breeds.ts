const dogBreeds: string[] = [
  "Affenpinscher", "Afghan Hound", "Airedale Terrier", "Akita", "Alaskan Malamute",
  "American Bulldog", "American English Coonhound", "American Eskimo Dog", "American Foxhound",
  "American Hairless Terrier", "American Staffordshire Terrier", "American Water Spaniel",
  "Anatolian Shepherd Dog", "Australian Cattle Dog", "Australian Shepherd", "Australian Terrier",
  "Azawakh", "Barbet", "Basenji", "Basset Fauve de Bretagne", "Basset Hound", "Beagle",
  "Bearded Collie", "Beauceron", "Bedlington Terrier", "Belgian Laekenois", "Belgian Malinois",
  "Belgian Sheepdog", "Belgian Tervuren", "Bergamasco Sheepdog", "Berger Picard",
  "Bernese Mountain Dog", "Bichon Frise", "Biewer Terrier", "Black and Tan Coonhound",
  "Black Russian Terrier", "Bloodhound", "Bluetick Coonhound", "Boerboel", "Border Collie",
  "Border Terrier", "Borzoi", "Boston Terrier", "Bouvier des Flandres", "Boxer", "Boykin Spaniel",
  "Bracco Italiano", "Briard", "Brittany", "Brussels Griffon", "Bull Terrier", "Bulldog",
  "Bullmastiff", "Cairn Terrier", "Canaan Dog", "Cane Corso", "Cardigan Welsh Corgi",
  "Cavalier King Charles Spaniel", "Cesky Terrier", "Chesapeake Bay Retriever", "Chihuahua",
  "Chinese Crested", "Chinese Shar-Pei", "Chinook", "Chow Chow", "Cirneco dell'Etna",
  "Clumber Spaniel", "Cocker Spaniel", "Collie", "Coton de Tulear", "Croatian Sheepdog",
  "Curly-Coated Retriever", "Dachshund", "Dalmatian", "Dandie Dinmont Terrier",
  "Danish-Swedish Farmdog", "Doberman Pinscher", "Dogo Argentino", "Dogue de Bordeaux",
  "English Cocker Spaniel", "English Foxhound", "English Setter", "English Springer Spaniel",
  "English Toy Spaniel", "Entlebucher Mountain Dog", "Field Spaniel", "Finnish Lapphund",
  "Finnish Spitz", "Flat-Coated Retriever", "French Bulldog", "German Pinscher",
  "German Shepherd Dog", "German Shorthaired Pointer", "German Wirehaired Pointer",
  "Giant Schnauzer", "Glen of Imaal Terrier", "Golden Retriever", "Gordon Setter",
  "Grand Basset Griffon Vendeen", "Great Dane", "Great Pyrenees", "Greater Swiss Mountain Dog",
  "Greyhound", "Harrier", "Havanese", "Ibizan Hound", "Icelandic Sheepdog",
  "Irish Red and White Setter", "Irish Setter", "Irish Terrier", "Irish Water Spaniel",
  "Irish Wolfhound", "Italian Greyhound", "Japanese Chin", "Japanese Spitz", "Keeshond",
  "Kerry Blue Terrier", "Komondor", "Kuvasz", "Labrador Retriever", "Lagotto Romagnolo",
  "Lakeland Terrier", "Lancashire Heeler", "Leonberger", "Lhasa Apso", "Lowchen", "Maltese",
  "Manchester Terrier", "Mastiff", "Miniature American Shepherd", "Miniature Bull Terrier",
  "Miniature Pinscher", "Miniature Schnauzer", "Mudi", "Neapolitan Mastiff", "Newfoundland",
  "Norfolk Terrier", "Norwegian Buhund", "Norwegian Elkhound", "Norwegian Lundehund",
  "Norwich Terrier", "Nova Scotia Duck Tolling Retriever", "Old English Sheepdog", "Otterhound",
  "Papillon", "Parson Russell Terrier", "Pekingese", "Pembroke Welsh Corgi",
  "Petit Basset Griffon Vendeen", "Pharaoh Hound", "Plott Hound", "Pointer",
  "Polish Lowland Sheepdog", "Pomeranian", "Poodle", "Portuguese Podengo Pequeno",
  "Portuguese Water Dog", "Pug", "Puli", "Pumi", "Pyrenean Shepherd", "Rat Terrier",
  "Redbone Coonhound", "Rhodesian Ridgeback", "Rottweiler", "Russell Terrier", "Russian Toy",
  "Russian Tsvetnaya Bolonka", "Saint Bernard", "Saluki", "Samoyed", "Schipperke",
  "Scottish Deerhound", "Scottish Terrier", "Sealyham Terrier", "Shetland Sheepdog", "Shiba Inu",
  "Shih Tzu", "Siberian Husky", "Silky Terrier", "Skye Terrier", "Sloughi", "Small Munsterlander",
  "Smooth Fox Terrier", "Soft Coated Wheaten Terrier", "Spanish Water Dog", "Spinone Italiano",
  "Staffordshire Bull Terrier", "Standard Schnauzer", "Sussex Spaniel", "Swedish Vallhund",
  "Teddy Roosevelt Terrier", "Thai Ridgeback", "Tibetan Mastiff", "Tibetan Spaniel",
  "Tibetan Terrier", "Toy Fox Terrier", "Treeing Walker Coonhound", "Vizsla", "Weimaraner",
  "Welsh Springer Spaniel", "Welsh Terrier", "West Highland White Terrier", "Whippet",
  "Wire Fox Terrier", "Wirehaired Pointing Griffon", "Wirehaired Vizsla", "Xoloitzcuintli",
  "Yorkshire Terrier",
];

const catBreeds: string[] = [
  "Abyssinian", "American Bobtail", "American Curl", "American Shorthair", "American Wirehair",
  "Balinese", "Bengal", "Birman", "Bombay", "British Shorthair", "Burmese", "Burmilla",
  "Chartreux", "Colorpoint Shorthair", "Cornish Rex", "Devon Rex", "Egyptian Mau",
  "European Burmese", "Exotic Shorthair", "Havana Brown", "Japanese Bobtail", "Khao Manee",
  "Korat", "LaPerm", "Lykoi", "Maine Coon", "Manx", "Norwegian Forest Cat", "Ocicat",
  "Oriental", "Persian", "Ragamuffin", "Ragdoll", "Russian Blue", "Scottish Fold", "Selkirk Rex",
  "Siamese", "Siberian", "Singapura", "Somali", "Sphynx", "Tonkinese", "Toybob",
  "Turkish Angora", "Turkish Van",
];

function buildValidBreeds(breeds: string[]): Set<string> {
  const set = new Set<string>();
  set.add("Mixed Breed");
  for (const b of breeds) {
    set.add(b);
    set.add(`${b} Mix`);
  }
  return set;
}

const validDogBreeds = buildValidBreeds(dogBreeds);
const validCatBreeds = buildValidBreeds(catBreeds);

export function isValidBreed(breed: string, species?: string): boolean {
  if (!breed || !breed.trim()) return false;
  if (species === "cat") return validCatBreeds.has(breed);
  if (species === "dog") return validDogBreeds.has(breed);
  return validDogBreeds.has(breed) || validCatBreeds.has(breed);
}
