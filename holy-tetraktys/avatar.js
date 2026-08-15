const elements = [
  'metal',
  'water',
  'fire',
  'wood',
  'earth',
  'metal',
  'water',
  'fire',
  'wood',
];

const lackness = {
  metal:
    'Lung or large intestine problems; Isolation; Cynicism; Skin allergies/problems Respiratory problems, Asthma',
  water:
    'Kidney or bladder problems; Fearful or phobias; Low back pain, sciatica; Impotence or frigidity; Frequently urination; Dark shadow or bags under the eyes; Aversion to cold; Disorders of the central nervous system',
  fire:
    'Heart or small intestine problems; Cardiovascular diseases; Blood circulations; Insomnia; Restlessness or forgetfulness; Hypertensive; Over excited or craves stimulants; Speech disorders; Depressed when alone; Pain in chest region',
  wood:
    'Bone structure; Liver or gallbladder problems; Anger or complete absence of it; Impatience or easily frustrated; Eye problems; Problems with equilibrium or coordination; Tendon problems; Lack of flexibility or stiffness; Tension cramps especially in the shoulders; Muscle spasms; Bitter taste in mouth; Irregular menses.',
  earth:
    'Stomach or pancreas or spleen problems; Immune system problems; Digestive problems (gas or belching); Lack of absorption; Lymphatic problems; Loose bowels; Anemia; Hemorrhoids; Overweight or under weight; Inability to receive nutrient',
};

const careerOptions = {
  wood: `Profession:
  Doctor, Dentist, Pharmacist, Professor, Lecturer, Teacher, Administrator, Administrative Executive,
  Secretary, Publisher, Librarian, Herbalist, Priest, Pastor, Monk, Nun, Carpenter, Florist, Artist.
  Business:
  Medical related field, Furniture, Paper Industry, Education Institution ‐ School, Kindergarten, College,
  Library, Woodcraft, Clothing & Fabric, Related work on Human Culture, Bookshop, Planting, Farming,
  Horticulture, Gardening Business ‐ Landscaping, Foresting, Sawmill, Chinese Medicine, Pharmacy,
  Hospital, Clinic, Medicare, Herbal Food.`,
  fire: `Profession:
  Electrical & Electronic / Mechatronics Engineer, Psychologist, Nurse, Writer, Journalist, Designer,
  Graphic Designer, Movie Maker, Chef, Cook, Electrician, Beauty Therapist, Pilot, Receptionist,
  Computer Programmer, Fashion Designer.
  Business:
  Restaurant, Food Outlet, Coffee Shop, Canteen, Advertising Agency, News & Magazine Business,
  Telecommunication ‐ Hand phones, Computer & Network, Multimedia, Information Technology,
  Branding, Air Freight, Oil & Gas, Power Plant, Power Cable, Weaponry, Petrol Station, Cosmetic
  Business, Design Studio, Departmental Store, Accessories (car & etc.) shop.`,
  metal: `Profession:
  Lawyer, Judge, Magistrate, Bank Executive, Bank Manager, Bank Teller, Mechanical Engineer,
  Automotive Engineer, Scientist, Researcher, Stock Broker, Enforcement Officer, Mechanic, Police
  Officer, Armed Forces, Miner, Goldsmith, Jeweller.
  Business:
Law Firm, Legal Work, Bank & Financial Institution, Sports Science, Pawn Shop, Transportation ‐ Taxi;
Lorry; Bus, Engineering Firm, Security Guard Business, Supply of Military Equipment, Mining Business
(Earth & Metal), Jewellery Shop, Car / Motorcycle Dealership Business, Exercise Equipment, Work
related to Science & Research, Stock Broking Agency.`,
  water: `Profession:
  Sales Executive; Marketing Executive, Manager, Management Executive, Public Relations, Insurance
  Agent, Diplomat, Mathematician, Actuarial Science, Chemist, Philosopher, Newscaster, Reporter,
  Hawker, Magician, Fisherman, Driver, Postman, Plumber.
  Business:
  Service Based Business, Hospitality Management, Tourism, Pub, Trading, MLM company, Internet
  business, Water Filter business, Money Changer, Maids Agency, Supply of Labour business, Human
  Resource Management, Insurance Agency, Travel Agency, Seafood business, Shipping, T.V. Station,
  Radio Station, Plumbing Work.`,
  earth: `Profession:
  Accountant, Architect, Civil Engineer, Consultant, Draftsman, Contractor, Renovator, Gardener, Real
  Estate Realtor, Developer, Fortune Teller, Feng Shui Practitioner, Astrologist, Palmist.
  Business:
  Real Estate, Accounting Firm, Antique Shop, Housing Development business, Gemstone, Marble,
  Mining business (Earth and Metal), Pottery, Charity organization, Funeral Parlour, Temple, Church.`,
};

const careerElementPriorities = {
  wood: ['earth', 'water', 'wood', 'fire', 'metal'],
  fire: ['metal', 'wood', 'fire', 'earth', 'water'],
  metal: ['wood', 'earth', 'metal', 'water', 'fire'],
  water: ['fire', 'metal', 'water', 'wood', 'earth'],
  earth: ['water', 'fire', 'earth', 'metal', 'wood'],
};
