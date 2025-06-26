// Location/Places related interfaces
export interface LocationCreateDTO {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  country?: string;
}

export interface LocationResponseDTO {
  id: number;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  createdAt: string;
  locationName?: string;
  userId: number;
  username: string;
  email: string;
}

// Friends related interfaces
export interface FriendRequestDTO {
  id: number;
  sender: UserDTO;
  receiver: UserDTO;
  requestTime: string;
  responseTime?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED';
}

export interface UserDTO {
  id: number;
  username: string;
  email: string;
}

// Geocoding related interfaces
export interface GeocodingData {
  country?: string;
  state?: string;
  county?: string;
  city?: string;
  district?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  lon: number;
  lat: number;
  formatted: string;
  category?: string;
  country_code?: string;
  county_code?: string;
  iso3166_2?: string;
  state_code?: string;
  result_type?: string;
  address_line1?: string;
  address_line2?: string;
  plus_code?: string;
  plus_code_short?: string;
  place_id?: string;
}
