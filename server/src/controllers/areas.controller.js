// Configurable list of Deori Taluka and neighboring areas
// NOTE: Explicit user selection. No GPS tracking used.

const DEORI_TALUKA_AREAS = [
  {
    id: 'deori-hq',
    name: 'Deori Town (HQ)',
    marathi: 'देवरी शहर (मुख्यालय)',
    type: 'Nagar Panchayat / Taluka HQ',
    isHeadquarters: true,
    distanceKmNote: '0 km (Center)',
  },
  {
    id: 'chichgarh',
    name: 'Chichgarh',
    marathi: 'चिचगड',
    type: 'Major Village / Circle Office',
    isHeadquarters: false,
    distanceKmNote: '~22 km South',
  },
  {
    id: 'soundad',
    name: 'Soundad',
    marathi: 'सौंदड',
    type: 'Commercial Junction / Station Area',
    isHeadquarters: false,
    distanceKmNote: '~18 km West',
  },
  {
    id: 'borgaon',
    name: 'Borgaon',
    marathi: 'बोरगाव',
    type: 'Gram Panchayat Area',
    isHeadquarters: false,
    distanceKmNote: '~12 km East',
  },
  {
    id: 'salekasa-border',
    name: 'Salekasa Border Belt',
    marathi: 'सालेकसा सीमा क्षेत्र',
    type: 'Border Sub-Region',
    isHeadquarters: false,
    distanceKmNote: '~25 km North',
  },
  {
    id: 'shiwnikalan',
    name: 'Shiwnikalan',
    marathi: 'शिवणीकलां',
    type: 'Agricultural Cluster',
    isHeadquarters: false,
    distanceKmNote: '~14 km South-East',
  },
  {
    id: 'mando-devi',
    name: 'Mando Devi Temple Precinct',
    marathi: 'मांडो देवी परिसर',
    type: 'Cultural & Pilgrimage Zone',
    isHeadquarters: false,
    distanceKmNote: '~8 km Forest Route',
  },
  {
    id: 'kohmara',
    name: 'Kohmara Junction',
    marathi: 'कोहमारा जंक्शन',
    type: 'Highway Transit Node',
    isHeadquarters: false,
    distanceKmNote: '~16 km NH-53',
  },
];

export function getAreas(req, res) {
  res.json({
    success: true,
    taluka: 'Deori Taluka',
    district: 'Gondia',
    state: 'Maharashtra',
    accuracyNotice: 'Area selection is explicitly user-configured. No live GPS or device tracking is utilized.',
    data: DEORI_TALUKA_AREAS,
  });
}
