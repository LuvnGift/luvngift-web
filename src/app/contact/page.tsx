'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Mail, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Enter a valid email address'),
  comment: z.string().min(10, 'Message must be at least 10 characters').max(2000),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactForm) => {
    try {
      await api.post('/api/v1/contact', data);
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to send message. Please try again.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-20 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 mx-auto">
              <MessageSquare className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-3">Contact us</h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Have a question, feedback, or need help with an order? We'd love to hear from you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Contact info */}
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Email us</p>
                  <p className="text-sm text-muted-foreground">info@luvngift.com</p>
                  <p className="text-xs text-muted-foreground mt-1">We reply within 24-48 hours</p>
                </div>
              </div>

              <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground mb-1">Support hours</p>
                Mon – Fri: 9 am – 6 pm EST<br />
                Sat: 10 am – 2 pm EST<br />
                Sun: Closed
              </div>
            </div>

            {/* Form */}
            <div className="md:col-span-2">
              {submitted ? (
                <Card>
                  <CardContent className="flex flex-col items-center text-center py-12 gap-4">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                    <div>
                      <h2 className="text-xl font-semibold mb-2">Message sent!</h2>
                      <p className="text-muted-foreground">
                        Thanks for reaching out. We'll get back to you within 24-48 hours.
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setSubmitted(false)}>
                      Send another message
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Send a message</CardTitle>
                    <CardDescription>Fill in the form below and we'll be in touch shortly.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="firstName">First name</Label>
                          <Input id="firstName" {...register('firstName')} placeholder="Jane" />
                          {errors.firstName && <p className="text-destructive text-xs">{errors.firstName.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="lastName">Last name</Label>
                          <Input id="lastName" {...register('lastName')} placeholder="Doe" />
                          {errors.lastName && <p className="text-destructive text-xs">{errors.lastName.message}</p>}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="email">Email address</Label>
                        <Input id="email" type="email" {...register('email')} placeholder="jane@example.com" />
                        {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="comment">Message</Label>
                        <Textarea
                          id="comment"
                          {...register('comment')}
                          placeholder="Tell us how we can help…"
                          rows={5}
                        />
                        {errors.comment && <p className="text-destructive text-xs">{errors.comment.message}</p>}
                      </div>

                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Sending…' : 'Send message'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
