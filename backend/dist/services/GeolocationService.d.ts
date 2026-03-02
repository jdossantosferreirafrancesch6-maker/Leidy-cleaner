/**
 * Serviço de Geolocalização
 * Integração com Mapbox para autocomplete de endereços
 */
interface MapboxFeature {
    id: string;
    text: string;
    place_name: string;
    center: [number, number];
    geometry: {
        type: string;
        coordinates: [number, number];
    };
    properties?: {
        [key: string]: any;
    };
}
interface Location {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}
export declare const GeolocationService: {
    /**
     * Autocomplete de endereços usando Mapbox
     */
    autocompleteAddress(query: string, country?: string): Promise<MapboxFeature[]>;
    /**
     * Geocode: Converter endereço em coordenadas
     */
    geocodeAddress(address: string): Promise<Location | null>;
    /**
     * Reverse Geocoding: Converter coordenadas em endereço
     */
    reverseGeocode(latitude: number, longitude: number): Promise<Location | null>;
    /**
     * Calcular distância entre dois pontos (Fórmula de Haversine)
     */
    calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): {
        kilometers: number;
        miles: number;
    };
    /**
     * Estimar tempo de viagem entre dois pontos
     * 100 km = ~1.5 horas de carro + tempo de parada
     */
    estimateTravelTime(distanceKm: number, avgSpeedKmh?: number): number;
    /**
     * Sug
  
  erir staff baseado na localização
     * Encontra staff mais próximos do cliente
     */
    suggestNearbyStaff(customerLatitude: number, customerLongitude: number, maxDistance?: number, maxSuggestions?: number): Promise<any[]>;
    /**
     * Validar se endereço está dentro da área de atendimento
     */
    isWithinServiceArea(customerLatitude: number, customerLongitude: number, serviceAreaCenter: {
        lat: number;
        lng: number;
    }, radiusKm?: number): boolean;
    /**
     * Gerar mapa para exibir location
     */
    generateMapEmbedUrl(latitude: number, longitude: number, zoom?: number): string;
    /**
     * Validar coordenadas
     */
    isValidCoordinates(latitude: number, longitude: number): boolean;
    /**
     * Limpar e normalizar endereço
     */
    normalizeAddress(address: string): string;
};
export default GeolocationService;
//# sourceMappingURL=GeolocationService.d.ts.map