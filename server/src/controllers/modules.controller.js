const LOCALHUB_MODULES = [
  {
    id: 'jobs',
    slug: 'jobs-hub',
    title: 'Jobs Hub',
    marathiTitle: 'रोजगार केंद्र',
    category: 'Opportunities',
    featured: true,
    tagline: 'Local employment, skilled labor & seasonal openings',
    description: 'Find taluka-level job openings, shop assistants, tractor drivers, accounting, welding, and harvest season requirements across Deori Taluka.',
    icon: 'Briefcase',
    badge: 'Phase 3',
    status: 'planned_phase_3',
    highlights: ['Direct Employer Contact', 'Zero Intermediary Fees', 'Local Skill Registry'],
    sampleSearchKeywords: ['driver', 'accountant', 'welder', 'field worker', 'sales', 'cook'],
  },
  {
    id: 'rentals',
    slug: 'rentals-pg',
    title: 'Rentals & PG',
    marathiTitle: 'भाडे आणि पीजी',
    category: 'Property & Spaces',
    featured: true,
    tagline: 'Rooms, family homes, commercial shops & agricultural godowns',
    description: 'Verified residential rentals, student PG rooms, commercial retail shops on NH-53, and storage spaces in Deori and surrounding hubs.',
    icon: 'Home',
    badge: 'Phase 3',
    status: 'planned_phase_3',
    highlights: ['Direct Owner Contact', 'Deposit & Terms Transparency', 'No Broker Fees'],
    sampleSearchKeywords: ['room', '1bhk', 'shop', 'godown', 'pg', 'commercial'],
  },
  {
    id: 'rides',
    slug: 'ride-delivery',
    title: 'Ride & Delivery',
    marathiTitle: 'प्रवास आणि पार्सल',
    category: 'Transit & Logistics',
    featured: false,
    tagline: 'Local auto-rickshaw stands, rural shared jeeps & local parcel runs',
    description: 'Coordinate local transit between Deori, Chichgarh, Soundad, and Gondia junctions. Inter-village delivery requests and scheduled shared transport.',
    icon: 'Truck',
    badge: 'Phase 4 (Stand-Based)',
    status: 'active',
    highlights: ['Phone-Based Driver Confirmation', 'Fixed Stand Rates', 'No Live GPS Required'],
    sampleSearchKeywords: ['auto', 'jeep', 'parcel', 'tempo', 'chichgarh ride'],
  },
  {
    id: 'krishi',
    slug: 'krishi-bazaar',
    title: 'Krishi Bazaar',
    marathiTitle: 'कृषी बाजार',
    category: 'Agriculture & Rural',
    featured: true,
    tagline: 'Farm produce, tractor rentals, seed & organic fertilizer supplies',
    description: 'Deori Taluka agricultural marketplace for paddy, pulses, farm implements, borewell drilling, harvester bookings, and direct farmer-to-buyer trades.',
    icon: 'Wheat',
    badge: 'Phase 3',
    status: 'active',
    highlights: ['Mandatory Quality Declarations', 'Harvester/Tractor Booking', 'Direct Agro-Trades'],
    sampleSearchKeywords: ['paddy', 'tractor', 'harvester', 'seeds', 'fertilizer', 'cattle'],
  },
  {
    id: 'marketplace',
    slug: 'marketplace',
    title: 'Marketplace',
    marathiTitle: 'स्थानिक बाजार (नवीन वस्तू)',
    category: 'Commerce',
    featured: false,
    tagline: 'Brand-new products from registered Deori shops and retailers only',
    description: 'Browse genuine, brand-new merchandise from verified local shops: hardware, electronics, clothing, stationery, and building materials.',
    icon: 'ShoppingBag',
    badge: 'Phase 3 (New Goods Only)',
    status: 'active',
    highlights: ['New Products Only (No Second-Hand)', 'Local Shop Warranty', 'Direct Store Pickup'],
    sampleSearchKeywords: ['mobile', 'solar pump', 'cement', 'pipe', 'tools', 'fan'],
  },
  {
    id: 'services',
    slug: 'local-services',
    title: 'Local Services',
    marathiTitle: 'स्थानिक सेवा',
    category: 'Services',
    featured: true,
    tagline: 'Electricians, plumbers, carpenters, mechanics & technicians',
    description: 'On-demand local technicians and repair experts across Deori Taluka. Request callback or quote directly from verified independent technicians.',
    icon: 'Wrench',
    badge: 'Phase 3',
    status: 'active',
    highlights: ['Direct Phone Callback', 'Transparent Base Rates', 'Taluka Coverage Maps'],
    sampleSearchKeywords: ['electrician', 'plumber', 'mechanic', 'carpenter', 'ac repair'],
  },
  {
    id: 'events',
    slug: 'events-desk',
    title: 'Events Desk',
    marathiTitle: 'कार्यक्रम आणि जत्रा',
    category: 'Civic & Culture',
    featured: false,
    tagline: 'Village yatras, weekly haat bazaars, sports tourneys & cultural meets',
    description: 'Stay informed about Deori weekly haat dates, annual Mando Devi yatra, agricultural fairs, blood donation camps, and community gatherings.',
    icon: 'Calendar',
    badge: 'Phase 5 (Reviewed)',
    status: 'active',
    highlights: ['Community Submission Review', 'Verified Event Organizers', 'Weekly Haat Schedules'],
    sampleSearchKeywords: ['haat', 'yatra', 'cricket', 'camp', 'festival'],
  },
  {
    id: 'news',
    slug: 'taluka-news-feed',
    title: 'Taluka News Feed',
    marathiTitle: 'तालुका बातमीपत्र',
    category: 'Information',
    featured: false,
    tagline: 'Grassroots civic updates, weather advisories & road conditions',
    description: 'Reviewed and fact-checked local reports concerning canal water releases, NH-53 diversions, rural development updates, and educational notices.',
    icon: 'Newspaper',
    badge: 'Phase 5 (Reviewed)',
    status: 'active',
    highlights: ['Fact-Checked Submissions', 'Public Advisory Badges', 'No Clickbait or Rumors'],
    sampleSearchKeywords: ['nh53', 'canal', 'mseb', 'weather', 'rain', 'collector'],
  },
  {
    id: 'emergency',
    slug: 'emergency-contacts',
    title: 'Emergency Contacts',
    marathiTitle: 'आपत्कालीन व महत्त्वाचे संपर्क',
    category: 'Essential',
    featured: true,
    tagline: 'Verified Taluka Hospital, Police, Fire, Snake Rescuers & MSEDCL',
    description: 'Official emergency lifeline for Deori Taluka. Guaranteed immediate prominence. Changes require administrative verification before publication.',
    icon: 'ShieldAlert',
    badge: 'Verified Directory Active',
    status: 'active',
    highlights: ['Zero Invented Phone Numbers', 'Mandatory Official Audit', 'Permanent Home Visibility'],
    sampleSearchKeywords: ['police', 'hospital', 'ambulance', 'fire', 'snake', 'electricity'],
  },
  {
    id: 'directory',
    slug: 'business-directory',
    title: 'Business Directory',
    marathiTitle: 'व्यवसाय निर्देशिका',
    category: 'Commerce',
    featured: false,
    tagline: 'Complete directory of registered enterprises, traders & professionals',
    description: 'Comprehensive business registry for Deori Taluka with physical address, branch locations, operating hours, and authorized contact persons.',
    icon: 'Building2',
    badge: 'Phase 3',
    status: 'planned_phase_3',
    highlights: ['Verified Business Badges', 'Branch Profiles Support', 'Direct Enquiries'],
    sampleSearchKeywords: ['chemist', 'hotel', 'hardware', 'cloth', 'tractor dealer', 'bank'],
  },
];

export function getModules(req, res) {
  const { category, featured } = req.query;
  let filtered = [...LOCALHUB_MODULES];

  if (category && category !== 'All') {
    filtered = filtered.filter(m => m.category.toLowerCase() === category.toLowerCase());
  }

  if (featured === 'true') {
    filtered = filtered.filter(m => m.featured);
  }

  res.json({
    success: true,
    count: filtered.length,
    data: filtered,
  });
}

export function getModuleBySlug(req, res) {
  const { slug } = req.params;
  const found = LOCALHUB_MODULES.find(m => m.slug === slug || m.id === slug);

  if (!found) {
    return res.status(404).json({
      success: false,
      error: {
        message: `Module '${slug}' is not recognized in LocalHub X.`,
        code: 'MODULE_NOT_FOUND',
      },
    });
  }

  res.json({
    success: true,
    data: found,
  });
}
