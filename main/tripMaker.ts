import OpenAI from 'openai';
import axios from 'axios';
import Constants from 'expo-constants';

export interface AIResponse {
  category: string;
  places: RankedPlace[];
}

export interface RankedPlace {
  name: string;
  lat: number;
  lon: number;
  distance: number;
  category: string;
  address: string;
  explanation: string;
  ranking: number;
  imageUrl?: string;
  opening_hours?: string;
}

interface Place {
  name: string;
  lat: number;
  lon: number;
  distance: number;
  category: string;
  address: string;
  opening_hours?: string;
  isOpenNow?: boolean;
  imageUrl?: string;
}

interface FormattedLocation {
  name: string;
  distance: string;
  address: string;
  times: string;
  budget: string;
  lat: number;
  lon: number;
}

interface SeparatedPlaceArrays {
  names: string[];
  addresses: string[];
  latitudes: number[];
  longitudes: number[];
  distances: number[];
  categories: string[];
  imageUrls: string[];
  rankings: number[];
}

interface TripParams {
  searchQueries: string[];
  budget: string;
  distance: number;
  timeRange: {
    start: string;
    end: string;
  };
}

export const formatToLocationStructure = (places: RankedPlace[], budgetPerCategory: number): FormattedLocation[] => {
  return places.map(place => ({
    name: place.name,
    distance: place.distance.toFixed(2),
    address: place.address,
    times: place.opening_hours || "9:00 AM - 5:00 PM",
    budget: `$${budgetPerCategory}`,
    lat: place.lat,
    lon: place.lon
  }));
};

// Initialize OpenAI with environment variable
const openai = new OpenAI({
  apiKey: Constants.expoConfig?.extra?.openaiApiKey || process.env.OPENAI_API_KEY,
});

const fetchPlaceImage = async (place: RankedPlace): Promise<string> => {
  try {
    const response = await axios.get('https://commons.wikimedia.org/w/api.php', {
      params: {
        action: 'query',
        format: 'json',
        prop: 'imageinfo',
        generator: 'geosearch',
        iiurlwidth: 400,
        iiprop: 'url',
        ggscoord: `${place.lat}|${place.lon}`,
        ggsradius: 100,
        ggslimit: 1,
        origin: '*'
      }
    });

    const pages = response.data?.query?.pages || {};
    const firstPage = Object.values(pages)[0] as any;
    return firstPage?.imageinfo?.[0]?.url || '';
  } catch (error) {
    console.error('Error fetching image:', error);
    return '';
  }
};

export const arrayToString = (separatedArrays: SeparatedPlaceArrays): string => {
  return separatedArrays.names.map((name, index) => 
    [
      name,
      separatedArrays.addresses[index],
      separatedArrays.latitudes[index],
      separatedArrays.longitudes[index],
      separatedArrays.distances[index],
      separatedArrays.categories[index],
      separatedArrays.imageUrls[index],
      separatedArrays.rankings[index]
    ].join('|')
  ).join('\n');
};

export const stringToArray = (str: string): SeparatedPlaceArrays => {
  const lines = str.split('\n');
  const result: SeparatedPlaceArrays = {
    names: [],
    addresses: [],
    latitudes: [],
    longitudes: [],
    distances: [],
    categories: [],
    imageUrls: [],
    rankings: []
  };

  lines.forEach(line => {
    const [name, address, lat, lon, distance, category, imageUrl, ranking] = line.split('|');
    result.names.push(name);
    result.addresses.push(address);
    result.latitudes.push(parseFloat(lat));
    result.longitudes.push(parseFloat(lon));
    result.distances.push(parseFloat(distance));
    result.categories.push(category);
    result.imageUrls.push(imageUrl);
    result.rankings.push(parseInt(ranking) || 0);
  });

  return result;
};

const separateResponseFields = (places: RankedPlace[]): SeparatedPlaceArrays => {
  const separated: SeparatedPlaceArrays = {
    names: [],
    addresses: [],
    latitudes: [],
    longitudes: [],
    distances: [],
    categories: [],
    imageUrls: [],
    rankings: []
  };

  places.forEach(place => {
    if ('name' in place) separated.names.push(place.name);
    if ('address' in place) separated.addresses.push(place.address);
    if ('lat' in place) separated.latitudes.push(place.lat);
    if ('lon' in place) separated.longitudes.push(place.lon);
    if ('distance' in place) separated.distances.push(place.distance);
    if ('category' in place) separated.categories.push(place.category);
    if ('imageUrl' in place) separated.imageUrls.push(place.imageUrl || '');
    if ('ranking' in place) separated.rankings.push(place.ranking);
  });

  return separated;
};

const searchNearbyPlaces = async (
  lat: number, 
  lon: number, 
  params: TripParams,
): Promise<Place[]> => {
  try {
    const radius = params.distance;
    const allPlaces: Place[] = [];

    for (const searchTerm of params.searchQueries) {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          format: 'json',
          q: searchTerm,
          lat: lat,
          lon: lon,
          viewbox: `${lon-radius},${lat-radius},${lon+radius},${lat+radius}`,
          bounded: 1,
          limit: 5,
          addressdetails: 1,
          extratags: 1,
          'accept-language': 'en'
        },
        headers: {
          'User-Agent': 'YourApp/1.0'
        }
      });

      const places = response.data.map((place: any) => ({
        name: place.display_name.split(',')[0],
        lat: parseFloat(place.lat),
        lon: parseFloat(place.lon),
        distance: calculateDistance(lat, lon, parseFloat(place.lat), parseFloat(place.lon)),
        category: searchTerm.trim(),
        address: place.display_name,
        opening_hours: place.extratags?.opening_hours || 'Hours not available'
      }));

      allPlaces.push(...places);
    }

    return allPlaces;
  } catch (error) {
    console.error('OpenStreetMap error:', error);
    throw error;
  }
};

export const handlePlanTrip = async (lat: number, lon: number, params: TripParams) => {
  try {
    const places = await searchNearbyPlaces(lat, lon, params);
    const aiResponses: Array<{category: string, places: RankedPlace[]}> = [];
    const totalBudget = parseInt(params.budget);
    const categoriesCount = params.searchQueries.length;
    const budgetPerCategory = Math.floor(totalBudget / categoriesCount);

    for (const category of params.searchQueries) {
      const categoryPlaces = places.filter(p => p.category === category);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `
            Return JSON with exactly one place: {"places":[{"name":"","lat":0,"lon":0,"distance":0,"category":"","address":"","explanation":"","ranking":""}]}
            Select the best ${category} place from: ${JSON.stringify(categoryPlaces.slice(0, 5))}.
            Requirements:
            - Fixed budget: $${budgetPerCategory}
            - Distance: ${params.distance}km
            - Time: ${params.timeRange.start}-${params.timeRange.end}
            - Hours: ${categoryPlaces.map(p => `\n${p.name}: ${p.opening_hours}`).join('')}
            Keep explanation 10 words max.
            You must return JSON with properties in exact order: name MUST be first
            `
          }
        ],
        max_tokens: 250,
        temperature: 0.7,
        response_format: { type: "json_object" }
      });
      
      const content = response.choices[0]?.message?.content || '';
      if (content) {
        try {
          const parsed = JSON.parse(content);
          if (parsed.places && Array.isArray(parsed.places)) {
            const categoryPlaces = parsed.places;
            
            const placesWithImages = await Promise.all(
              categoryPlaces.map(async (place: RankedPlace) => ({
                ...place,
                imageUrl: await fetchPlaceImage(place as RankedPlace)
              }))
            );

            aiResponses.push({
              category,
              places: placesWithImages
            });
          }

        } catch (parseError) {
          console.error(`Parse error for ${category}:`, parseError);
        }
      }
    }

    const allPlaces = aiResponses.flatMap(response => response.places);
    return formatToLocationStructure(allPlaces, budgetPerCategory);

  } catch (error) {
    console.error('Trip planning error:', error);
    throw error;
  }
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const KM_TO_DEGREE = 0.01;
  
  const dx = lat2 - lat1;
  const dy = lon2 - lon1;
  
  const distanceInDegrees = Math.sqrt(dx * dx + dy * dy);
  
  return distanceInDegrees / KM_TO_DEGREE;
};