'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Building2, Users, Globe, FileText, Send } from 'lucide-react';

interface CommercialAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommercialAccountModal({ open, onOpenChange }: CommercialAccountModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    companySize: '',
    industry: '',
    useCase: '',
    estimatedRequests: '',
    additionalInfo: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName || !formData.contactName || !formData.email || !formData.useCase) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/commercial-account-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Application submitted successfully! We'll be in touch soon.");
        onOpenChange(false);
        setFormData({
          companyName: '',
          contactName: '',
          email: '',
          phone: '',
          companySize: '',
          industry: '',
          useCase: '',
          estimatedRequests: '',
          additionalInfo: '',
        });
      } else {
        const error = await response.text();
        toast.error('Failed to submit application: ' + error);
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
      console.error('Error submitting commercial account request:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <DialogTitle className="text-2xl">Apply for Commercial Account</DialogTitle>
            <Badge variant="secondary" className="text-xs">
              Early Access
            </Badge>
          </div>
          <DialogDescription>
            Get access to our powerful API for your business needs. We typically review applications within 24-48 hours.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Building2 className="h-5 w-5" />
              Company Information
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Acme Corp"
                  required
                />
              </div>

              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                  <SelectTrigger id="industry">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Retail">Retail</SelectItem>
                    <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="Consulting">Consulting</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="companySize">Company Size</Label>
              <Select value={formData.companySize} onValueChange={(value) => handleInputChange('companySize', value)}>
                <SelectTrigger id="companySize">
                  <SelectValue placeholder="Select company size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-1000">201-1000 employees</SelectItem>
                  <SelectItem value="1000+">1000+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5" />
              Contact Information
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+61 4XX XXX XXX"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Globe className="h-5 w-5" />
              API Usage Details
            </div>

            <div>
              <Label htmlFor="useCase">Use Case Description *</Label>
              <Textarea
                id="useCase"
                value={formData.useCase}
                onChange={(e) => handleInputChange('useCase', e.target.value)}
                placeholder="Describe how you plan to use the API..."
                className="min-h-[100px]"
                required
              />
            </div>

            <div>
              <Label htmlFor="estimatedRequests">Estimated Monthly API Requests</Label>
              <Select
                value={formData.estimatedRequests}
                onValueChange={(value) => handleInputChange('estimatedRequests', value)}
              >
                <SelectTrigger id="estimatedRequests">
                  <SelectValue placeholder="Select estimated usage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-10k">0 - 10,000 requests</SelectItem>
                  <SelectItem value="10k-100k">10,000 - 100,000 requests</SelectItem>
                  <SelectItem value="100k-1M">100,000 - 1M requests</SelectItem>
                  <SelectItem value="1M-10M">1M - 10M requests</SelectItem>
                  <SelectItem value="10M+">10M+ requests</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <FileText className="h-5 w-5" />
              Additional Information
            </div>

            <div>
              <Label htmlFor="additionalInfo">Additional Comments</Label>
              <Textarea
                id="additionalInfo"
                value={formData.additionalInfo}
                onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                placeholder="Any additional information you'd like to share..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
