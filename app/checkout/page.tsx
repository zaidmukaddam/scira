'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { ArrowLeft, CreditCard, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { betterauthClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useLocation } from '@/hooks/use-location';
import { useSession } from '@/lib/auth-client';
import { useProUserStatus } from '@/hooks/use-user-data';

const checkoutSchema = z.object({
  customer: z.object({
    email: z.string().email('Please enter a valid email address'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
  }),
  billing: z.object({
    street: z.string().min(5, 'Street address must be at least 5 characters'),
    city: z.string().min(2, 'City must be at least 2 characters'),
    state: z.string().min(2, 'State/Province must be at least 2 characters'),
    zipcode: z.string().min(3, 'Postal code must be at least 3 characters'),
    country: z.literal('IN'),
  }),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const location = useLocation();
  const { data: session, isPending } = useSession();
  const { isProUser, isLoading: isProStatusLoading } = useProUserStatus();

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customer: {
        email: '',
        name: '',
      },
      billing: {
        street: '',
        city: '',
        state: '',
        zipcode: '',
        country: 'IN', // Always India
      },
    },
  });

  const onSubmit = async (data: CheckoutFormData) => {
    setIsLoading(true);
    try {
      const checkoutData = {
        slug: process.env.NEXT_PUBLIC_PREMIUM_SLUG || 'premium-plan',
        customer: {
          email: data.customer.email,
          name: data.customer.name,
        },
        billing: {
          city: data.billing.city,
          country: 'IN', // Always India
          state: data.billing.state,
          street: data.billing.street,
          zipcode: data.billing.zipcode,
        },
        referenceId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      const { data: checkout, error } = await betterauthClient.checkout(checkoutData);

      if (error) {
        throw new Error(error.message || 'Checkout failed');
      }

      if (checkout?.url) {
        // Redirect to DodoPayments checkout
        window.location.href = checkout.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if not authenticated
  if (!isPending && !session) {
    router.push('/sign-up');
    return null;
  }

  // Only show this page for Indian users
  if (!location.loading && !location.isIndia) {
    router.push('/pricing');
    return null;
  }

  // Redirect if user already has Pro access
  if (!isProStatusLoading && isProUser) {
    router.push('/');
    return null;
  }

  // Show loading while checking session, location, or Pro status
  if (isPending || location.loading || isProStatusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Back to Pricing Link */}
      <div className="max-w-2xl mx-auto px-6 pt-6">
        <Link
          href="/pricing"
          className="inline-flex items-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors duration-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Pricing
        </Link>
      </div>

      {/* Header */}
      <div className="max-w-2xl mx-auto px-6 pt-8 pb-8">
        <div className="text-center">
          <CreditCard className="w-12 h-12 mx-auto mb-4 text-zinc-600 dark:text-zinc-400" />
          <h1 className="text-[2rem] font-medium tracking-tight text-zinc-900 dark:text-zinc-100 mb-4 leading-tight">
            Checkout
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed">
            Complete your one-time payment for Scira Pro
          </p>
          <div className="mt-4 space-y-2">
            <div className="inline-flex items-center bg-secondary text-secondary-foreground px-4 py-2 rounded-full text-sm">
              🇮🇳 One-time payment: ₹1500 for 1 month access
            </div>
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>GST and tax details will be calculated and shown during checkout</p>
              <p>
                Prefer a subscription? <Link href="/pricing" className="underline hover:text-foreground">Choose monthly billing instead</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Form */}
      <div className="max-w-2xl mx-auto px-6 pb-24">
        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
            <CardDescription>
              Please provide your details to complete the checkout process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Customer Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Customer Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customer.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customer.email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="john@example.com" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Billing Address */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Billing Address</h3>
                  <FormField
                    control={form.control}
                    name="billing.street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main Street, Apartment 4B" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="billing.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Mumbai" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billing.state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State/Province</FormLabel>
                          <FormControl>
                            <Input placeholder="Maharashtra" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="billing.zipcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input placeholder="400001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billing.country"
                      render={() => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input value="India" disabled className="bg-zinc-50 dark:bg-zinc-900" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6 border-t">
                  <Button
                    type="submit"
                    className="w-full h-12 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-medium text-sm tracking-[-0.01em] transition-all duration-200 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Continue to Payment
                        <CreditCard className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center mt-3">
                    You will be redirected to a secure payment page
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Tax Information Notice */}
        <div className="mt-6">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle>📄 Tax & Invoice Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>GST and applicable taxes will be calculated automatically during checkout</li>
                    <li>Tax breakdown will be clearly displayed before final payment confirmation</li>
                    <li>A detailed invoice with all charges and tax details will be sent to your email</li>
                    <li>Invoice will include GST registration details as per Indian tax regulations</li>
                  </ul>
            </CardContent>
          </Card>
        </div>

        {/* Security Notice */}
        <div className="mt-8 text-center">
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-6 py-4 inline-block">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              🔒 Secure checkout powered by{' '}
              <Link 
                href="https://dodopayments.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                DodoPayments
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 