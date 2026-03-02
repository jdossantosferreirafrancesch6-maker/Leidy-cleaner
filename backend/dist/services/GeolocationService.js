"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeolocationService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_advanced_1 = require("../utils/logger-advanced");
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
const MAPBOX_MAX_RESULTS = parseInt(process.env.MAPBOX_MAX_RESULTS || '10');
exports.GeolocationService = {
    /**
     * Autocomplete de endereços usando Mapbox
     */
    async autocompleteAddress(query, country = 'br') {
        try {
            if (!MAPBOX_TOKEN) {
                logger_advanced_1.logger.warn('⚠️ MAPBOX_TOKEN não configurado');
                return [];
            }
            const response = await axios_1.default.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`, {
                params: {
                    access_token: MAPBOX_TOKEN,
                    country,
                    limit: MAPBOX_MAX_RESULTS,
                    language: 'pt',
                    proximity: '-51.5,-10', // Centro do Brasil como ponto de partida
                },
            });
            return response.data.features || [];
        }
        catch (error) {
            logger_advanced_1.logger.error('Erro ao autocomplete enderço:', error);
            return [];
        }
    },
    /**
     * Geocode: Converter endereço em coordenadas
     */
    async geocodeAddress(address) {
        try {
            if (!MAPBOX_TOKEN) {
                logger_advanced_1.logger.warn('⚠️ MAPBOX_TOKEN não configurado');
                return null;
            }
            const response = await axios_1.default.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`, {
                params: {
                    access_token: MAPBOX_TOKEN,
                    country: 'br',
                    limit: 1,
                },
            });
            if (response.data.features.length === 0) {
                return null;
            }
            const feature = response.data.features[0];
            const [longitude, latitude] = feature.geometry.coordinates;
            // Extrair contexto
            const context = feature.context || [];
            let city = '';
            let state = '';
            let zipCode = '';
            for (const ctx of context) {
                if (ctx.id.includes('place')) {
                    city = ctx.text;
                }
                if (ctx.id.includes('region')) {
                    state = ctx.short_code?.split('-')[1] || '';
                }
                if (ctx.id.includes('postcode')) {
                    zipCode = ctx.text;
                }
            }
            return {
                latitude,
                longitude,
                address: feature.place_name,
                city,
                state,
                zipCode,
                country: 'Brazil',
            };
        }
        catch (error) {
            logger_advanced_1.logger.error('Erro ao geocodificar endereço:', error);
            return null;
        }
    },
    /**
     * Reverse Geocoding: Converter coordenadas em endereço
     */
    async reverseGeocode(latitude, longitude) {
        try {
            if (!MAPBOX_TOKEN) {
                logger_advanced_1.logger.warn('⚠️ MAPBOX_TOKEN não configurado');
                return null;
            }
            const response = await axios_1.default.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`, {
                params: {
                    access_token: MAPBOX_TOKEN,
                    language: 'pt',
                },
            });
            if (response.data.features.length === 0) {
                return null;
            }
            const feature = response.data.features[0];
            const context = feature.context || [];
            let city = '';
            let state = '';
            let zipCode = '';
            for (const ctx of context) {
                if (ctx.id.includes('place')) {
                    city = ctx.text;
                }
                if (ctx.id.includes('region')) {
                    state = ctx.short_code?.split('-')[1] || '';
                }
                if (ctx.id.includes('postcode')) {
                    zipCode = ctx.text;
                }
            }
            return {
                latitude,
                longitude,
                address: feature.place_name,
                city,
                state,
                zipCode,
                country: 'Brazil',
            };
        }
        catch (error) {
            logger_advanced_1.logger.error('Erro ao reverse geocodificar:', error);
            return null;
        }
    },
    /**
     * Calcular distância entre dois pontos (Fórmula de Haversine)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Raio da Terra em km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const km = R * c;
        return {
            kilometers: parseFloat(km.toFixed(2)),
            miles: parseFloat((km * 0.621371).toFixed(2)),
        };
    },
    /**
     * Estimar tempo de viagem entre dois pontos
     * 100 km = ~1.5 horas de carro + tempo de parada
     */
    estimateTravelTime(distanceKm, avgSpeedKmh = 60) {
        // Velocidade média em São Paulo/grandes cidades é ~60 km/h
        const travelTime = distanceKm / avgSpeedKmh;
        const bufferTime = 0.25; // 15 minutos de buffer por parada
        const totalHours = travelTime + bufferTime;
        return Math.round(totalHours * 60); // Retornar em minutos
    },
    /**
     * Sug
  
  erir staff baseado na localização
     * Encontra staff mais próximos do cliente
     */
    async suggestNearbyStaff(customerLatitude, customerLongitude, maxDistance = 10, // km
    maxSuggestions = 5) {
        try {
            // Nota: Esta função requer consulta ao banco de dados
            // Assumindo que a coluna 'location_geo' existe na tabela users
            // Usamos PostGIS se disponível ou cálculo em memória
            const distanceQuery = `
        SELECT 
          u.id, u.name, u.email, u.phone, u.role,
          u.latitude, u.longitude,
          ST_Distance(
            ST_GeomFromText('POINT(' || $1 || ' ' || $2 || ')', 4326)::geography,
            ST_GeomFromText('POINT(' || u.longitude || ' ' || u.latitude || ')', 4326)::geography
          ) / 1000 as distance_km,
          COALESCE(AVG(r.rating), 0) as rating,
          COUNT(DISTINCT b.id) as total_bookings
        FROM users u
        LEFT JOIN reviews r ON u.id = r.staff_id
        LEFT JOIN bookings b ON u.id = b.staff_id
        WHERE u.role IN ('staff', 'supervisor')
        AND u.status = 'active'
        AND ST_Distance(
          ST_GeomFromText('POINT(' || $1 || ' ' || $2 || ')', 4326)::geography,
          ST_GeomFromText('POINT(' || u.longitude || ' ' || u.latitude || ')', 4326)::geography
        ) / 1000 <= $3
        GROUP BY u.id
        ORDER BY distance_km ASC, rating DESC
        LIMIT $4
      `;
            // Nota: Este é um exemplo. No seu banco de dados real,
            // você precisará testar se PostGIS está instalado
            logger_advanced_1.logger.info(`🗺️ Sugerindo staff próximo a (${customerLatitude}, ${customerLongitude}) com máximo ${maxDistance}km`);
            // TODO: Executar query real no banco
            // const result = await pool.query(distanceQuery, [
            //   customerLongitude,
            //   customerLatitude,
            //   maxDistance,
            //   maxSuggestions,
            // ]);
            return [];
        }
        catch (error) {
            logger_advanced_1.logger.error('Erro ao sugerir staff próximo:', error);
            return [];
        }
    },
    /**
     * Validar se endereço está dentro da área de atendimento
     */
    isWithinServiceArea(customerLatitude, customerLongitude, serviceAreaCenter, radiusKm = 15) {
        const distance = this.calculateDistance(customerLatitude, customerLongitude, serviceAreaCenter.lat, serviceAreaCenter.lng);
        return distance.kilometers <= radiusKm;
    },
    /**
     * Gerar mapa para exibir location
     */
    generateMapEmbedUrl(latitude, longitude, zoom = 15) {
        if (!MAPBOX_TOKEN) {
            return '';
        }
        return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${longitude},${latitude},${zoom},0/600x400@2x?access_token=${MAPBOX_TOKEN}`;
    },
    /**
     * Validar coordenadas
     */
    isValidCoordinates(latitude, longitude) {
        return (latitude >= -90 &&
            latitude <= 90 &&
            longitude >= -180 &&
            longitude <= 180);
    },
    /**
     * Limpar e normalizar endereço
     */
    normalizeAddress(address) {
        return address
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s,-]/g, '');
    },
};
exports.default = exports.GeolocationService;
//# sourceMappingURL=GeolocationService.js.map