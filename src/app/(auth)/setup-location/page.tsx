'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateLocationSchema, UpdateLocationInput } from '@celebrate4me/shared';
import { useSetLocation } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

const COUNTRIES = [
  { code: 'CA', name: 'Canada' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
] as const;

const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

const GB_REGIONS = [
  { code: 'ENG', name: 'England' },
  { code: 'SCT', name: 'Scotland' },
  { code: 'WLS', name: 'Wales' },
  { code: 'NIR', name: 'Northern Ireland' },
];

export default function SetupLocationPage() {
  const { mutate: setLocation, isPending } = useSetLocation({ redirectTo: '/' });
  const [selectedCountry, setSelectedCountry] = useState<string>('');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<UpdateLocationInput>({
    resolver: zodResolver(updateLocationSchema),
  });

  const country = watch('buyerCountry');

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'CA' | 'US' | 'GB';
    setValue('buyerCountry', val);
    setValue('buyerProvince', undefined);
    setSelectedCountry(val);
  };

  const provinceOptions =
    country === 'CA' ? CANADIAN_PROVINCES :
    country === 'US' ? US_STATES :
    country === 'GB' ? GB_REGIONS : [];

  const provinceLabel =
    country === 'CA' ? 'Province / Territory' :
    country === 'GB' ? 'Region' : 'State';

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Your billing address</CardTitle>
        <CardDescription>
          We use this to calculate the correct taxes on your orders. This is your home address,
          not the delivery destination in Nigeria.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => setLocation(data))} className="space-y-4">
          {/* Country */}
          <div className="space-y-1.5">
            <Label htmlFor="buyerCountry">Country</Label>
            <select
              id="buyerCountry"
              {...register('buyerCountry')}
              onChange={handleCountryChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select country…</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            {errors.buyerCountry && (
              <p className="text-destructive text-xs">{errors.buyerCountry.message}</p>
            )}
          </div>

          {/* Street */}
          <div className="space-y-1.5">
            <Label htmlFor="billingStreet">Street address</Label>
            <Input
              id="billingStreet"
              {...register('billingStreet')}
              placeholder="123 Main St"
            />
            {errors.billingStreet && (
              <p className="text-destructive text-xs">{errors.billingStreet.message}</p>
            )}
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <Label htmlFor="billingCity">City</Label>
            <Input
              id="billingCity"
              {...register('billingCity')}
              placeholder="Toronto"
            />
            {errors.billingCity && (
              <p className="text-destructive text-xs">{errors.billingCity.message}</p>
            )}
          </div>

          {/* Province / State — shown once country is selected */}
          {country && provinceOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="buyerProvince">
                {provinceLabel}
                {country !== 'CA' && <span className="text-muted-foreground ml-1">(optional)</span>}
              </Label>
              <select
                id="buyerProvince"
                {...register('buyerProvince')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select {provinceLabel.toLowerCase()}…</option>
                {provinceOptions.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
              {errors.buyerProvince && (
                <p className="text-destructive text-xs">{errors.buyerProvince.message}</p>
              )}
              {country === 'CA' && (
                <p className="text-xs text-muted-foreground">
                  Canadian orders are subject to GST/HST/PST based on your province.
                </p>
              )}
            </div>
          )}

          {/* Postal code */}
          <div className="space-y-1.5">
            <Label htmlFor="billingPostalCode">
              Postal / ZIP code
              <span className="text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Input
              id="billingPostalCode"
              {...register('billingPostalCode')}
              placeholder={country === 'US' ? '10001' : country === 'GB' ? 'SW1A 1AA' : 'A1B 2C3'}
            />
          </div>

          {country && country !== 'CA' && (
            <p className="text-sm text-muted-foreground rounded-md bg-muted/50 p-3">
              No tax will be applied to your orders.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isPending || !country}>
            {isPending ? 'Saving…' : 'Continue'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
