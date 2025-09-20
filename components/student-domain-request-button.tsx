'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Copy, Mail, Send } from 'lucide-react';

export function StudentDomainRequestButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [universityName, setUniversityName] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [showEmailDraft, setShowEmailDraft] = useState(false);

  const generateEmailDraft = () => {
    const subject = 'Request to Add University Domain for Student Discount';
    const body = `Hi,

I would like to request that my university domain be added to your student discount program.

University Details:
- University Name: ${universityName}
- Email Domain: ${emailDomain}
- My Student Email: ${studentEmail}

${
  additionalInfo
    ? `Additional Information:
${additionalInfo}

`
    : ''
}I am a current student at this university and would love to access the student discount for Scira Pro.

Thank you for considering my request!

Best regards`;

    return { subject, body };
  };

  const handleSubmit = () => {
    if (!universityName || !emailDomain || !studentEmail) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { subject, body } = generateEmailDraft();

    // Ensure proper line breaks for email clients
    const formattedBody = body.replace(/\n/g, '%0D%0A');
    const mailtoLink = `mailto:zaid@scira.ai?subject=${encodeURIComponent(subject)}&body=${formattedBody}`;

    // Open email client
    window.location.href = mailtoLink;

    toast.success('Email draft opened in your email client!');
    setIsOpen(false);
  };

  const copyEmailDraft = () => {
    const { subject, body } = generateEmailDraft();
    const fullEmail = `Subject: ${subject}\n\n${body}`;

    navigator.clipboard.writeText(fullEmail).then(() => {
      toast.success('Email draft copied to clipboard!');
    });
  };

  const reset = () => {
    setUniversityName('');
    setEmailDomain('');
    setStudentEmail('');
    setAdditionalInfo('');
    setShowEmailDraft(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Mail className="w-4 h-4" />
          Request University Domain
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request University Domain</DialogTitle>
          <DialogDescription>
            Help us add your university to our student discount program. Fill out the form below and we&apos;ll prepare
            an email for you to send.
          </DialogDescription>
        </DialogHeader>

        {!showEmailDraft ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="university">University Name *</Label>
              <Input
                id="university"
                placeholder="e.g., Stanford University"
                value={universityName}
                onChange={(e) => setUniversityName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Email Domain *</Label>
              <Input
                id="domain"
                placeholder="e.g., @stanford.edu"
                value={emailDomain}
                onChange={(e) => setEmailDomain(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-email">Your Student Email *</Label>
              <Input
                id="student-email"
                type="email"
                placeholder="e.g., john.doe@stanford.edu"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional-info">Additional Information (Optional)</Label>
              <Textarea
                id="additional-info"
                placeholder="Any additional details about your university or verification documents you can provide..."
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="flex-1 gap-2">
                <Send className="w-4 h-4" />
                Send Request
              </Button>
              <Button variant="outline" onClick={() => setShowEmailDraft(true)} className="gap-2">
                <Copy className="w-4 h-4" />
                Preview
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email Preview</Label>
              <div className="p-3 bg-muted rounded-lg text-sm">
                <div className="font-medium mb-3 pb-2 border-b border-border">
                  Subject: {generateEmailDraft().subject}
                </div>
                <div className="whitespace-pre-wrap leading-relaxed">{generateEmailDraft().body}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="flex-1 gap-2">
                <Send className="w-4 h-4" />
                Send Email
              </Button>
              <Button variant="outline" onClick={copyEmailDraft} className="gap-2">
                <Copy className="w-4 h-4" />
                Copy
              </Button>
              <Button variant="ghost" onClick={() => setShowEmailDraft(false)}>
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
