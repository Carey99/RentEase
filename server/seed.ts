import { storage } from './storage';

// Seed data for testing authentication
export async function seedDatabase() {
    try {
        console.log('🌱 Seeding database with test users...');

        // Check if test users already exist
        const existingLandlord = await storage.getUserByEmail('landlord@example.com');
        const existingTenant = await storage.getUserByEmail('tenant@example.com');

        if (existingLandlord && existingTenant) {
            console.log('✅ Test users already exist, checking assignments...');

            // Ensure landlord has properties
            const landlordProperties = await storage.getPropertiesByLandlord(existingLandlord.id);
            if (landlordProperties.length === 0) {
                console.log('⚠️  Landlord has no properties, creating test properties...');

                // Create a test property for the landlord
                await storage.createProperty({
                    landlordId: existingLandlord.id,
                    name: 'Sunset Apartments',
                    propertyTypes: [
                        { type: '1bedroom', price: '1000' },
                        { type: '2bedroom', price: '1200' },
                        { type: 'studio', price: '800' }
                    ],
                    utilities: {
                        electricity: true,
                        water: true,
                        internet: false,
                        garbage: true,
                        security: false,
                        other: false
                    },
                    totalUnits: '20'
                });
                console.log('✅ Created test property: Sunset Apartments');
            }

            // Check if tenant has apartment assignment
            const existingAssignment = await storage.getTenantProperty(existingTenant.id);
            if (!existingAssignment) {
                console.log('⚠️  Tenant has no apartment assignment, creating one...');
                const updatedLandlordProperties = await storage.getPropertiesByLandlord(existingLandlord.id);
                if (updatedLandlordProperties.length > 0) {
                    const property = updatedLandlordProperties[0];
                    console.log('Using property ID:', property._id?.toString());

                    await storage.createTenantProperty({
                        tenantId: existingTenant.id,
                        propertyId: property._id?.toString() || property.id,
                        propertyType: '2bedroom',
                        unitNumber: 'A101',
                        rentAmount: '1200'
                    });
                    console.log('✅ Assigned test tenant to apartment A101 in Sunset Apartments');
                } else {
                    console.log('⚠️  Still no properties found for landlord after creation');
                }
            } else {
                console.log('✅ Test tenant already has apartment assignment');
            }
            return;
        }        // Create test landlord
        let landlord = existingLandlord;
        if (!existingLandlord) {
            landlord = await storage.createUser({
                fullName: 'John Landlord',
                email: 'landlord@example.com',
                password: 'password123',
                role: 'landlord'
            });
            console.log('✅ Created test landlord:', landlord.email);

            // Create a test property for the landlord
            await storage.createProperty({
                landlordId: landlord.id,
                name: 'Sunset Apartments',
                propertyTypes: [
                    { type: '1bedroom', price: '1000' },
                    { type: '2bedroom', price: '1200' },
                    { type: 'studio', price: '800' }
                ],
                utilities: {
                    electricity: true,
                    water: true,
                    internet: false,
                    garbage: true,
                    security: false,
                    other: false
                },
                totalUnits: '20'
            });
            console.log('✅ Created test property: Sunset Apartments');

            // Create another test property
            await storage.createProperty({
                landlordId: landlord.id,
                name: 'Green Valley Complex',
                propertyTypes: [
                    { type: '1bedroom', price: '900' },
                    { type: '2bedroom', price: '1100' }
                ],
                utilities: {
                    electricity: true,
                    water: true,
                    internet: true,
                    garbage: true,
                    security: true,
                    other: false
                },
                totalUnits: '15'
            });
            console.log('✅ Created test property: Green Valley Complex');
        }

        // Create test tenant
        if (!existingTenant) {
            const tenant = await storage.createUser({
                fullName: 'Jane Tenant',
                email: 'tenant@example.com',
                password: 'password123',
                role: 'tenant'
            });
            console.log('✅ Created test tenant:', tenant.email);

            // Get the created properties to assign tenant to one
            if (landlord) {
                const landlordProperties = await storage.getPropertiesByLandlord(landlord.id);
                if (landlordProperties.length > 0) {
                    const property = landlordProperties[0]; // Assign to first property (Sunset Apartments)

                    await storage.createTenantProperty({
                        tenantId: tenant.id,
                        propertyId: property._id as string,
                        propertyType: '2bedroom',
                        unitNumber: 'A101',
                        rentAmount: '1200'
                    });
                    console.log('✅ Assigned test tenant to apartment A101 in Sunset Apartments');
                }
            }
        }

        console.log('🎉 Database seeding completed successfully!');
        console.log('📋 Test credentials:');
        console.log('   Landlord: landlord@example.com / password123');
        console.log('   Tenant: tenant@example.com / password123');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    }
}
