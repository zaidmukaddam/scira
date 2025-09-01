import { tool } from 'ai';
import { z } from 'zod';

export const pharmacyLocatorTool = tool({
  description: 'Find nearby pharmacies, check medication availability, and get pharmacy information.',
  inputSchema: z.object({
    location: z.string().describe('User location (city, address, or coordinates)'),
    medication: z.string().optional().describe('Specific medication to check availability for'),
    radius: z.number().optional().describe('Search radius in kilometers (default: 10km)'),
    openNow: z.boolean().optional().describe('Filter for pharmacies currently open'),
  }),
  execute: async ({ location, medication, radius = 10, openNow = false }) => {
    try {
      // For hackathon demo - using mock data
      // In production, this would call Famasi's backend API and Google Places API
      const mockPharmacies = [
        {
          name: 'HealthPlus Pharmacy',
          address: '123 Lagos Island, Lagos State',
          phone: '+234 801 234 5678',
          distance: '0.8 km',
          rating: 4.5,
          openHours: '8:00 AM - 10:00 PM',
          isOpen: true,
          services: ['Prescription filling', 'Consultation', 'Home delivery'],
          hasStock: medication ? Math.random() > 0.3 : undefined,
        },
        {
          name: 'MedPlus Pharmacy',
          address: '456 Victoria Island, Lagos State',
          phone: '+234 802 345 6789',
          distance: '1.2 km',
          rating: 4.2,
          openHours: '7:00 AM - 9:00 PM',
          isOpen: true,
          services: ['Prescription filling', 'Health screening'],
          hasStock: medication ? Math.random() > 0.3 : undefined,
        },
        {
          name: 'Alpha Pharmacy',
          address: '789 Ikeja, Lagos State',
          phone: '+234 803 456 7890',
          distance: '2.5 km',
          rating: 4.0,
          openHours: '9:00 AM - 8:00 PM',
          isOpen: false,
          services: ['Prescription filling', 'Medical supplies'],
          hasStock: medication ? Math.random() > 0.3 : undefined,
        },
      ];

      let filteredPharmacies = mockPharmacies.filter(pharmacy => 
        parseFloat(pharmacy.distance) <= radius
      );

      if (openNow) {
        filteredPharmacies = filteredPharmacies.filter(pharmacy => pharmacy.isOpen);
      }

      return {
        pharmacies: filteredPharmacies,
        searchLocation: location,
        searchRadius: radius,
        medicationQuery: medication,
        totalFound: filteredPharmacies.length,
        message: `Found ${filteredPharmacies.length} pharmacies near ${location}`,
        ...(medication && {
          stockAvailability: filteredPharmacies.filter(p => p.hasStock).length,
          stockMessage: `${filteredPharmacies.filter(p => p.hasStock).length} pharmacies have ${medication} in stock`
        })
      };
    } catch (error) {
      console.error('Pharmacy locator error:', error);
      return {
        error: 'Unable to find pharmacies at this time. Please try again later.',
        location,
      };
    }
  },
});
