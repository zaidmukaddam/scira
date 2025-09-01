import { tool } from 'ai';
import { z } from 'zod';

export const medicationSearchTool = tool({
  description: 'Search for medications by name, condition, or symptoms. Find drug information, interactions, and availability.',
  inputSchema: z.object({
    query: z.string().describe('Medication name, medical condition, or symptoms to search for'),
    location: z.string().optional().describe('User location to find nearby pharmacies with the medication'),
    checkInteractions: z.boolean().optional().describe('Whether to check for drug interactions with other medications'),
  }),
  execute: async ({ query, location, checkInteractions = false }) => {
    try {
      // For hackathon demo - using mock data
      // In production, this would call Famasi's backend API
      const mockMedications = [
        {
          name: 'Paracetamol',
          genericName: 'Acetaminophen',
          dosage: '500mg',
          form: 'Tablet',
          uses: ['Pain relief', 'Fever reduction'],
          sideEffects: ['Nausea', 'Liver damage (overdose)'],
          price: '₦500-800',
          availability: 'In stock at 12 nearby pharmacies',
          prescription: false,
        },
        {
          name: 'Amoxicillin',
          genericName: 'Amoxicillin',
          dosage: '250mg',
          form: 'Capsule',
          uses: ['Bacterial infections', 'Respiratory infections'],
          sideEffects: ['Diarrhea', 'Allergic reactions'],
          price: '₦1,200-1,800',
          availability: 'Available at 8 nearby pharmacies',
          prescription: true,
        },
      ];

      // Filter medications based on query
      const results = mockMedications.filter(med => 
        med.name.toLowerCase().includes(query.toLowerCase()) ||
        med.uses.some(use => use.toLowerCase().includes(query.toLowerCase()))
      );

      if (results.length === 0) {
        return {
          message: `No medications found for "${query}". Please try a different search term or consult with a healthcare provider.`,
          suggestions: ['Check spelling', 'Try generic name', 'Consult pharmacist'],
        };
      }

      return {
        medications: results,
        searchQuery: query,
        location: location || 'Nigeria',
        disclaimer: '⚠️ This information is for educational purposes only. Always consult with a healthcare provider before taking any medication.',
        ...(checkInteractions && {
          interactionWarning: 'Please provide your current medications to check for interactions.'
        })
      };
    } catch (error) {
      console.error('Medication search error:', error);
      return {
        error: 'Unable to search medications at this time. Please try again later.',
        query,
      };
    }
  },
});
