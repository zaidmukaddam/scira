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
import { sileo } from 'sileo';
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
      sileo.error({ title: 'Please fill in all required fields' });
      return;
    }

    const { subject, body } = generateEmailDraft();

    const formattedBody = body.replace(/\n/g, '%0D%0A');
    const mailtoLink = `mailto:zaid@scira.ai?subject=${encodeURIComponent(subject)}&body=${formattedBody}`;

    window.location.href = mailtoLink;

    sileo.success({ title: 'Email draft opened in your email client!' });
    setIsOpen(false);
  };

  const copyEmailDraft = () => {
    const { subject, body } = generateEmailDraft();
    const fullEmail = `Subject: ${subject}\n\n${body}`;

    navigator.clipboard.writeText(fullEmail).then(() => {
      sileo.success({ title: 'Email draft copied to clipboard!' });
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
        <Button variant="outline" size="sm" className="rounded-lg gap-1.5 h-8 text-xs">
          <Mail className="w-3.5 h-3.5" />
          Request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-tight">Request Domain</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Add your university to the student discount program.
          </DialogDescription>
        </DialogHeader>

        {!showEmailDraft ? (
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="university" className="text-[11px] text-muted-foreground">University Name *</Label>
              <Input
                id="university"
                placeholder="e.g., Stanford University"
                value={universityName}
                onChange={(e) => setUniversityName(e.target.value)}
                className="rounded-lg h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="domain" className="text-[11px] text-muted-foreground">Email Domain *</Label>
              <Input
                id="domain"
                placeholder="e.g., @stanford.edu"
                value={emailDomain}
                onChange={(e) => setEmailDomain(e.target.value)}
                className="rounded-lg h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="student-email" className="text-[11px] text-muted-foreground">Your Student Email *</Label>
              <Input
                id="student-email"
                type="email"
                placeholder="e.g., john.doe@stanford.edu"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                className="rounded-lg h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="additional-info" className="text-[11px] text-muted-foreground">Additional Info</Label>
              <Textarea
                id="additional-info"
                placeholder="Any additional details..."
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                rows={2}
                className="rounded-lg resize-none text-sm"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={handleSubmit} size="sm" className="flex-1 gap-1.5 rounded-lg h-8 text-xs">
                <Send className="w-3 h-3" />
                Send Request
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowEmailDraft(true)} className="gap-1.5 rounded-lg h-8 text-xs">
                <Copy className="w-3 h-3" />
                Preview
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Email Preview</Label>
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <div className="px-3 py-2 border-b border-border/40 bg-muted/30">
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">Subject:</span> {generateEmailDraft().subject}
                  </p>
                </div>
                <div className="px-3 py-3 whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed">
                  {generateEmailDraft().body}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={handleSubmit} size="sm" className="flex-1 gap-1.5 rounded-lg h-8 text-xs">
                <Send className="w-3 h-3" />
                Send
              </Button>
              <Button variant="outline" size="sm" onClick={copyEmailDraft} className="gap-1.5 rounded-lg h-8 text-xs">
                <Copy className="w-3 h-3" />
                Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowEmailDraft(false)} className="rounded-lg h-8 text-xs">
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
