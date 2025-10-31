import { createClient } from 'redis';

const client = createClient({
    username: 'default',
    password: 'gX94CVL0mRXXi7hligXMmMavy4lr55PV',
    socket: {
        host: 'redis-12372.c54.ap-northeast-1-2.ec2.redns.redis-cloud.com',
        port: 12372
    }
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();

// Geospatial Data example - storing and querying location data
class GeospatialManager {
    constructor(redisClient) {
        this.client = redisClient;
    }

    // Add locations to a geospatial index
    async addLocations(key, locations) {
        const args = [];

        for (const location of locations) {
            args.push(location.longitude, location.latitude, location.id);
        }

        const added = await this.client.geoAdd(key, args);
        console.log(`Added ${added} locations to ${key}`);
        return added;
    }

    // Get position of a specific location
    async getPosition(key, member) {
        const position = await this.client.geoPos(key, member);
        if (position && position.length > 0) {
            return {
                longitude: position[0][0],
                latitude: position[0][1]
            };
        }
        return null;
    }

    // Calculate distance between two locations
    async getDistance(key, member1, member2, unit = 'km') {
        const distance = await this.client.geoDist(key, member1, member2, unit);
        return distance;
    }

    // Find locations within radius of a point
    async findNearby(key, longitude, latitude, radius, unit = 'km', options = {}) {
        const { count, sort = 'ASC' } = options;

        const args = [key, longitude, latitude, radius, unit];
        if (count) args.push('COUNT', count);
        if (sort === 'DESC') args.push('DESC');
        args.push('WITHCOORD', 'WITHDIST');

        const results = await this.client.geoRadius(key, ...args);

        return results.map(result => ({
            id: result[0],
            coordinates: {
                longitude: result[1][0],
                latitude: result[1][1]
            },
            distance: parseFloat(result[2])
        }));
    }

    // Find locations within radius of another location
    async findNearbyLocation(key, member, radius, unit = 'km', options = {}) {
        const { count, sort = 'ASC' } = options;

        const args = [key, member, radius, unit];
        if (count) args.push('COUNT', count);
        if (sort === 'DESC') args.push('DESC');
        args.push('WITHCOORD', 'WITHDIST');

        const results = await this.client.geoRadiusByMember(key, ...args);

        return results.map(result => ({
            id: result[0],
            coordinates: {
                longitude: result[0][0],
                latitude: result[0][1]
            },
            distance: parseFloat(result[2])
        }));
    }

    // Get geohash for a location
    async getGeohash(key, member) {
        const geohash = await this.client.geoHash(key, member);
        return geohash.length > 0 ? geohash[0] : null;
    }

    // Remove locations from geospatial index
    async removeLocations(key, members) {
        const removed = await this.client.zRem(key, members);
        console.log(`Removed ${removed} locations from ${key}`);
        return removed;
    }

    // Get bounding box search
    async searchBoundingBox(key, minLongitude, minLatitude, maxLongitude, maxLatitude) {
        // This would require Redis 6.2+ with GEOSEARCH command
        // For now, we'll implement a workaround using ZRANGEBYSCORE
        console.log('Bounding box search requires Redis 6.2+ with GEOSEARCH command');
        return [];
    }
}

// Demo the geospatial functionality
async function demoGeospatial() {
    const geo = new GeospatialManager(client);

    console.log('=== Redis Geospatial Data Demo ===\n');

    // Add restaurant locations
    console.log('1. Adding restaurant locations:');
    const restaurants = [
        { id: 'restaurant1', latitude: 40.7128, longitude: -74.0060, name: 'Pizza Palace', cuisine: 'Italian' },
        { id: 'restaurant2', latitude: 40.7589, longitude: -73.9851, name: 'Burger Barn', cuisine: 'American' },
        { id: 'restaurant3', latitude: 40.7505, longitude: -73.9934, name: 'Sushi Spot', cuisine: 'Japanese' },
        { id: 'restaurant4', latitude: 40.7614, longitude: -73.9776, name: 'Taco Town', cuisine: 'Mexican' },
        { id: 'restaurant5', latitude: 40.7282, longitude: -73.7949, name: 'Pasta Place', cuisine: 'Italian' }
    ];

    await geo.addLocations('restaurants:nyc', restaurants.map(r => ({
        id: r.id,
        latitude: r.latitude,
        longitude: r.longitude
    })));

    // Store additional restaurant data
    for (const restaurant of restaurants) {
        await client.hSet(`restaurant:${restaurant.id}`, {
            name: restaurant.name,
            cuisine: restaurant.cuisine,
            latitude: restaurant.latitude.toString(),
            longitude: restaurant.longitude.toString()
        });
    }
    console.log();

    // Get position of a specific restaurant
    console.log('2. Getting position of Pizza Palace:');
    const position = await geo.getPosition('restaurants:nyc', 'restaurant1');
    console.log('Pizza Palace coordinates:', position);
    console.log();

    // Calculate distance between restaurants
    console.log('3. Calculating distances:');
    const distance1 = await geo.getDistance('restaurants:nyc', 'restaurant1', 'restaurant2', 'km');
    const distance2 = await geo.getDistance('restaurants:nyc', 'restaurant1', 'restaurant3', 'km');
    console.log(`Pizza Palace to Burger Barn: ${distance1} km`);
    console.log(`Pizza Palace to Sushi Spot: ${distance2} km`);
    console.log();

    // Find restaurants near Times Square (40.7580, -73.9855)
    console.log('4. Finding restaurants near Times Square (within 2km):');
    const nearbyTimesSquare = await geo.findNearby('restaurants:nyc', -73.9855, 40.7580, 2, 'km', { count: 5 });
    for (const restaurant of nearbyTimesSquare) {
        const details = await client.hGetAll(`restaurant:${restaurant.id}`);
        console.log(`  ${details.name} (${restaurant.distance.toFixed(2)} km away)`);
    }
    console.log();

    // Find restaurants near another restaurant
    console.log('5. Finding restaurants near Pizza Palace (within 5km):');
    const nearbyPizzaPalace = await geo.findNearbyLocation('restaurants:nyc', 'restaurant1', 5, 'km', { count: 3 });
    for (const restaurant of nearbyPizzaPalace) {
        if (restaurant.id !== 'restaurant1') { // Exclude the restaurant itself
            const details = await client.hGetAll(`restaurant:${restaurant.id}`);
            console.log(`  ${details.name} (${restaurant.distance.toFixed(2)} km away)`);
        }
    }
    console.log();

    // Get geohash for locations
    console.log('6. Getting geohashes:');
    const geohash1 = await geo.getGeohash('restaurants:nyc', 'restaurant1');
    const geohash2 = await geo.getGeohash('restaurants:nyc', 'restaurant2');
    console.log(`Pizza Palace geohash: ${geohash1}`);
    console.log(`Burger Barn geohash: ${geohash2}`);
    console.log();

    // Add delivery driver locations
    console.log('7. Adding delivery driver locations:');
    const drivers = [
        { id: 'driver1', latitude: 40.7200, longitude: -74.0100, name: 'John Driver', vehicle: 'bike' },
        { id: 'driver2', latitude: 40.7500, longitude: -73.9900, name: 'Jane Driver', vehicle: 'car' },
        { id: 'driver3', latitude: 40.7600, longitude: -73.9800, name: 'Bob Driver', vehicle: 'scooter' }
    ];

    await geo.addLocations('drivers:nyc', drivers.map(d => ({
        id: d.id,
        latitude: d.latitude,
        longitude: d.longitude
    })));

    for (const driver of drivers) {
        await client.hSet(`driver:${driver.id}`, {
            name: driver.name,
            vehicle: driver.vehicle,
            status: 'available'
        });
    }
    console.log();

    // Find nearest drivers to a customer
    console.log('8. Finding nearest drivers to customer at (40.7550, -73.9950):');
    const customerLat = 40.7550;
    const customerLng = -73.9950;

    const nearestDrivers = await geo.findNearby('drivers:nyc', customerLng, customerLat, 3, 'km', { count: 2 });
    for (const driver of nearestDrivers) {
        const details = await client.hGetAll(`driver:${driver.id}`);
        console.log(`  ${details.name} (${details.vehicle}) - ${driver.distance.toFixed(2)} km away`);
    }
    console.log();

    // Simulate driver movement
    console.log('9. Simulating driver movement:');
    // Move driver1 closer to customer
    await geo.addLocations('drivers:nyc', [
        { id: 'driver1', latitude: 40.7530, longitude: -73.9970 } // New position
    ]);

    const updatedDrivers = await geo.findNearby('drivers:nyc', customerLng, customerLat, 3, 'km', { count: 2 });
    console.log('Updated nearest drivers:');
    for (const driver of updatedDrivers) {
        const details = await client.hGetAll(`driver:${driver.id}`);
        console.log(`  ${details.name} (${details.vehicle}) - ${driver.distance.toFixed(2)} km away`);
    }
    console.log();

    // Find restaurants by cuisine type (combining geospatial with other queries)
    console.log('10. Finding Italian restaurants near Times Square:');
    const allNearby = await geo.findNearby('restaurants:nyc', -73.9855, 40.7580, 5, 'km');

    const italianRestaurants = [];
    for (const restaurant of allNearby) {
        const details = await client.hGetAll(`restaurant:${restaurant.id}`);
        if (details.cuisine === 'Italian') {
            italianRestaurants.push({
                ...restaurant,
                name: details.name,
                cuisine: details.cuisine
            });
        }
    }

    console.log('Italian restaurants found:');
    italianRestaurants.forEach(restaurant => {
        console.log(`  ${restaurant.name} (${restaurant.distance.toFixed(2)} km away)`);
    });

    await client.disconnect();
    console.log('\nGeospatial demo completed!');
}

demoGeospatial().catch(console.error);